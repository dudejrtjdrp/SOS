import type { NextRequest } from "next/server";
import { getAuthContext, workspaceOfProject, isMember, withinBudget } from "@/server/auth";
import { errorResponse } from "@/lib/api";
import { RunInput } from "@/core/schemas";
import { streamRun } from "@/server/engine";

export const maxDuration = 60;

/** POST /api/runs — execute a module, stream the result (docs/04 §4.1). */
export async function POST(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return errorResponse("UNAUTHENTICATED", "로그인이 필요합니다.");

  let body;
  try {
    body = RunInput.parse(await req.json());
  } catch {
    return errorResponse("VALIDATION", "입력이 올바르지 않습니다.");
  }

  const workspaceId = await workspaceOfProject(ctx.supabase, body.projectId);
  if (!workspaceId || !(await isMember(ctx.supabase, workspaceId, ctx.user.id))) {
    return errorResponse("FORBIDDEN", "이 프로젝트에 접근할 권한이 없습니다.");
  }
  if (!(await withinBudget(ctx.supabase, workspaceId))) {
    return errorResponse("BUDGET_EXCEEDED", "이번 달 토큰 예산을 초과했습니다.");
  }

  try {
    const { response } = await streamRun({
      supabase: ctx.supabase,
      userId: ctx.user.id,
      projectId: body.projectId,
      moduleId: body.moduleId,
      inputs: body.inputs,
      useRag: body.useRag,
    });
    return response;
  } catch (e) {
    return errorResponse(
      "PROVIDER_ERROR",
      e instanceof Error ? e.message : "실행에 실패했습니다.",
      true,
    );
  }
}

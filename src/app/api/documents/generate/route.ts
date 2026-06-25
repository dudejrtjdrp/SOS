import { NextResponse, type NextRequest } from "next/server";
import { getAuthContext, workspaceOfProject, isMember, withinBudget } from "@/server/auth";
import { errorResponse } from "@/lib/api";
import { DocumentGenerateInput } from "@/core/schemas";
import { generateDocument } from "@/server/documents";

export const maxDuration = 300;

/** POST /api/documents/generate — one-click document (docs/04 §4.2). */
export async function POST(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return errorResponse("UNAUTHENTICATED", "로그인이 필요합니다.");

  let body;
  try {
    body = DocumentGenerateInput.parse(await req.json());
  } catch {
    return errorResponse("VALIDATION", "입력이 올바르지 않습니다.");
  }

  const workspaceId = await workspaceOfProject(ctx.supabase, body.projectId);
  if (!workspaceId || !(await isMember(ctx.supabase, workspaceId, ctx.user.id))) {
    return errorResponse("FORBIDDEN", "권한이 없습니다.");
  }
  if (!(await withinBudget(ctx.supabase, workspaceId))) {
    return errorResponse("BUDGET_EXCEEDED", "이번 달 토큰 예산을 초과했습니다.");
  }

  try {
    const result = await generateDocument(ctx.supabase, ctx.user.id, {
      projectId: body.projectId,
      docType: body.docType,
      preset: body.preset,
      language: body.language,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return errorResponse(
      "PROVIDER_ERROR",
      e instanceof Error ? e.message : "문서 생성 실패",
      true,
    );
  }
}

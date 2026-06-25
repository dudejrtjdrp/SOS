import type { NextRequest } from "next/server";
import { streamText } from "ai";
import type { ModelMessage } from "ai";
import { z } from "zod";
import { getAuthContext, workspaceOfProject, isMember, withinBudget } from "@/server/auth";
import { errorResponse } from "@/lib/api";
import { model, selectModel } from "@/core/ai";
import { retrieve } from "@/core/rag";

export const maxDuration = 60;

const Body = z.object({
  projectId: z.string().uuid(),
  messages: z.array(
    z.object({ role: z.enum(["user", "assistant"]), content: z.string() }),
  ),
});

/** POST /api/chat — KB + RAG grounded project chat (docs/06 §2.8). */
export async function POST(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return errorResponse("UNAUTHENTICATED", "로그인이 필요합니다.");

  let body;
  try {
    body = Body.parse(await req.json());
  } catch {
    return errorResponse("VALIDATION", "잘못된 요청입니다.");
  }

  const workspaceId = await workspaceOfProject(ctx.supabase, body.projectId);
  if (!workspaceId || !(await isMember(ctx.supabase, workspaceId, ctx.user.id))) {
    return errorResponse("FORBIDDEN", "권한이 없습니다.");
  }
  if (!(await withinBudget(ctx.supabase, workspaceId))) {
    return errorResponse("BUDGET_EXCEEDED", "이번 달 토큰 예산을 초과했습니다.");
  }

  const { data: kb } = await ctx.supabase
    .from("knowledge_bases")
    .select("fields")
    .eq("project_id", body.projectId)
    .maybeSingle();

  const lastUser = [...body.messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const rag = await retrieve(ctx.supabase, body.projectId, lastUser, 6);

  const system =
    "너는 이 창업 프로젝트의 AI 파트너다. 아래 Knowledge Base와 자료를 근거로 한국어로 간결하고 실용적으로 답하라. 근거 없는 수치는 추정임을 밝혀라.\n" +
    `<knowledge_base>\n${JSON.stringify(kb?.fields ?? {})}\n</knowledge_base>\n` +
    (rag.chunks.length
      ? `<context>\n${rag.chunks.map((c) => `- (${c.label}) ${c.content}`).join("\n")}\n</context>`
      : "");

  const { modelId, temperature } = selectModel("drafting");
  const result = streamText({
    model: model(modelId),
    temperature,
    system,
    messages: body.messages as ModelMessage[],
  });
  return result.toTextStreamResponse();
}

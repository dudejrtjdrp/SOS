"use server";

import { z } from "zod";
import { getAuthContext } from "@/server/auth";
import { ok, fail, type Result } from "@/lib/result";
import { formatProjectContext } from "@/core/prompt-engine/export-context";
import { KB_FIELD_LABEL } from "@/core/modules/guide";

/**
 * AI-free chat path. Builds a compact project-context block (Knowledge Base +
 * recent verified analysis notes) the user pastes once into an external chat
 * (ChatGPT/Claude/Gemini) to converse there with the same grounding the in-app
 * chat had. No LLM call.
 */
export async function buildChatContext(input: {
  projectId: string;
}): Promise<Result<{ context: string }>> {
  const parsed = z.object({ projectId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return fail("VALIDATION", "입력이 올바르지 않습니다.");

  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");
  const sb = ctx.supabase;

  const { data: kbRow } = await sb
    .from("knowledge_bases")
    .select("fields")
    .eq("project_id", parsed.data.projectId)
    .maybeSingle();
  const kbFields = (kbRow?.fields ?? {}) as Record<string, unknown>;
  const kb = Object.entries(kbFields)
    .filter(([, v]) => typeof v === "string" && v.trim() !== "")
    .map(([k, v]) => ({ label: KB_FIELD_LABEL[k] ?? k, value: String(v).trim() }));

  // Verified analysis promoted into the KB makes the strongest grounding; cap
  // the count and each body so the pasted block stays manageable.
  const { data: entries } = await sb
    .from("knowledge_entries")
    .select("title, body, created_at")
    .eq("project_id", parsed.data.projectId)
    .order("created_at", { ascending: false })
    .limit(12);
  const notes = (entries ?? []).map((e) => ({
    title: (e.title as string) ?? "분석 자료",
    body: String(e.body ?? "").slice(0, 800),
  }));

  if (kb.length === 0 && notes.length === 0) {
    return fail("NOT_FOUND", "복사할 내용이 없어요. 먼저 Knowledge Base를 채우거나 분석 결과를 저장하세요.");
  }

  return ok({ context: formatProjectContext({ kb, notes }) });
}

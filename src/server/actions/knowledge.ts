"use server";

import { z } from "zod";
import { getAuthContext } from "@/server/auth";
import { indexSource } from "@/core/rag";
import { ok, fail, type Result } from "@/lib/result";

/** Merge-update the structured KB fields (auto-saved from the editor). */
export async function updateKnowledgeFields(input: {
  projectId: string;
  fields: Record<string, unknown>;
}): Promise<Result> {
  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");

  const { data: kb } = await ctx.supabase
    .from("knowledge_bases")
    .select("id, fields")
    .eq("project_id", input.projectId)
    .single();
  if (!kb) return fail("NOT_FOUND", "Knowledge Base를 찾을 수 없습니다.");

  const merged = { ...(kb.fields ?? {}), ...input.fields };
  const { error } = await ctx.supabase
    .from("knowledge_bases")
    .update({ fields: merged })
    .eq("id", kb.id);
  if (error) return fail("INTERNAL", error.message);
  return ok(undefined);
}

export async function addKnowledgeEntry(input: {
  projectId: string;
  title?: string;
  body: string;
  sourceType?: "note" | "upload" | "web" | "artifact";
  sourceUrl?: string;
}): Promise<Result<{ id: string }>> {
  const parsed = z
    .object({
      projectId: z.string().uuid(),
      title: z.string().optional(),
      body: z.string().min(1),
      sourceType: z.enum(["note", "upload", "web", "artifact"]).default("note"),
      sourceUrl: z.string().url().optional(),
    })
    .safeParse(input);
  if (!parsed.success) return fail("VALIDATION", "내용을 입력하세요.");
  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");

  const { data: kb } = await ctx.supabase
    .from("knowledge_bases")
    .select("id, workspace_id")
    .eq("project_id", parsed.data.projectId)
    .single();
  if (!kb) return fail("NOT_FOUND", "Knowledge Base를 찾을 수 없습니다.");

  const { data: entry, error } = await ctx.supabase
    .from("knowledge_entries")
    .insert({
      knowledge_base_id: kb.id,
      workspace_id: kb.workspace_id,
      project_id: parsed.data.projectId,
      title: parsed.data.title ?? null,
      body: parsed.data.body,
      source_type: parsed.data.sourceType,
      source_url: parsed.data.sourceUrl ?? null,
      created_by: ctx.user.id,
    })
    .select("id")
    .single();
  if (error) return fail("INTERNAL", error.message);

  // Index for RAG (best-effort).
  try {
    await indexSource(ctx.supabase, {
      workspaceId: kb.workspace_id,
      projectId: parsed.data.projectId,
      sourceType: "knowledge_entry",
      sourceId: entry.id,
      text: parsed.data.body,
    });
    await ctx.supabase.from("knowledge_entries").update({ embedding_status: "done" }).eq("id", entry.id);
  } catch {
    await ctx.supabase.from("knowledge_entries").update({ embedding_status: "failed" }).eq("id", entry.id);
  }

  return ok({ id: entry.id });
}

export async function deleteKnowledgeEntry(input: { entryId: string }): Promise<Result> {
  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");
  await ctx.supabase.from("embeddings").delete().eq("source_type", "knowledge_entry").eq("source_id", input.entryId);
  const { error } = await ctx.supabase.from("knowledge_entries").delete().eq("id", input.entryId);
  if (error) return fail("FORBIDDEN", error.message);
  return ok(undefined);
}

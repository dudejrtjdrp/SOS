"use server";

import { getAuthContext } from "@/server/auth";
import { indexSource } from "@/core/rag";
import { ok, fail, type Result } from "@/lib/result";
import type { VerificationStatus } from "@/types/db";

export async function pinArtifact(input: { artifactId: string; pinned: boolean }): Promise<Result> {
  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");
  const { error } = await ctx.supabase
    .from("artifacts")
    .update({ pinned: input.pinned })
    .eq("id", input.artifactId);
  if (error) return fail("FORBIDDEN", error.message);
  return ok(undefined);
}

export async function rateArtifact(input: { artifactId: string; feedback: 1 | -1 }): Promise<Result> {
  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");
  const { error } = await ctx.supabase
    .from("artifacts")
    .update({ feedback: input.feedback })
    .eq("id", input.artifactId);
  if (error) return fail("FORBIDDEN", error.message);
  return ok(undefined);
}

/** The human decision gate (docs/08 §4.1): verify / send back / reject an
 *  artifact, optionally recording the founder's judgment. Only 'human_verified'
 *  artifacts may be promoted to the Knowledge Base or finalized into a document. */
export async function verifyArtifact(input: {
  artifactId: string;
  status: VerificationStatus;
  founderTake?: string;
}): Promise<Result> {
  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");

  const patch: Record<string, unknown> = { verification_status: input.status };
  if (input.founderTake !== undefined) patch.founder_take = input.founderTake.trim() || null;
  if (input.status === "human_verified") {
    patch.verified_by = ctx.user.id;
    patch.verified_at = new Date().toISOString();
  } else {
    patch.verified_by = null;
    patch.verified_at = null;
  }

  const { error } = await ctx.supabase
    .from("artifacts")
    .update(patch)
    .eq("id", input.artifactId);
  if (error) return fail("FORBIDDEN", error.message);
  return ok(undefined);
}

/** Promote an artifact into a reusable Knowledge Base entry.
 *  Gated: requires verification_status = 'human_verified' (docs/08 §4.1). */
export async function saveArtifactToKnowledge(input: { artifactId: string }): Promise<Result<{ entryId: string }>> {
  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");

  const { data: art } = await ctx.supabase
    .from("artifacts")
    .select("title, content_md, content, workspace_id, project_id, verification_status, founder_take")
    .eq("id", input.artifactId)
    .single();
  if (!art) return fail("NOT_FOUND", "결과를 찾을 수 없습니다.");

  // Decision Gate: an unverified result cannot become KB "truth".
  if (art.verification_status !== "human_verified")
    return fail("FORBIDDEN", "먼저 검증을 완료해야 Knowledge Base에 저장할 수 있습니다.");

  const { data: kb } = await ctx.supabase
    .from("knowledge_bases")
    .select("id")
    .eq("project_id", art.project_id)
    .single();
  if (!kb) return fail("NOT_FOUND", "Knowledge Base를 찾을 수 없습니다.");

  const base = art.content_md ?? JSON.stringify(art.content);
  // Founder's Take rides along into the KB so the human judgment is preserved.
  const body = art.founder_take ? `창업자 판단: ${art.founder_take}\n\n${base}` : base;
  const { data: entry, error } = await ctx.supabase
    .from("knowledge_entries")
    .insert({
      knowledge_base_id: kb.id,
      workspace_id: art.workspace_id,
      project_id: art.project_id,
      title: art.title ?? "분석 결과",
      body,
      source_type: "artifact",
      source_artifact_id: input.artifactId,
      verification_status: "human_verified",
      created_by: ctx.user.id,
    })
    .select("id")
    .single();
  if (error) return fail("INTERNAL", error.message);

  try {
    await indexSource(ctx.supabase, {
      workspaceId: art.workspace_id,
      projectId: art.project_id,
      sourceType: "knowledge_entry",
      sourceId: entry.id,
      text: body,
    });
    await ctx.supabase.from("knowledge_entries").update({ embedding_status: "done" }).eq("id", entry.id);
  } catch {
    /* ignore */
  }

  return ok({ entryId: entry.id });
}

/** Persist a visualization layout (drag positions, axis labels) onto the artifact.
 *  Stored under a reserved content.__viz[templateId] key — no schema migration. */
export async function saveArtifactViz(input: {
  artifactId: string;
  templateId: string;
  layout: unknown;
}): Promise<Result> {
  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");

  const { data: art } = await ctx.supabase
    .from("artifacts")
    .select("content")
    .eq("id", input.artifactId)
    .single();
  if (!art) return fail("NOT_FOUND", "결과를 찾을 수 없습니다.");

  const content =
    art.content && typeof art.content === "object" && !Array.isArray(art.content)
      ? { ...(art.content as Record<string, unknown>) }
      : {};
  const viz =
    content.__viz && typeof content.__viz === "object"
      ? { ...(content.__viz as Record<string, unknown>) }
      : {};
  viz[input.templateId] = input.layout;
  content.__viz = viz;

  const { error } = await ctx.supabase
    .from("artifacts")
    .update({ content })
    .eq("id", input.artifactId);
  if (error) return fail("FORBIDDEN", error.message);
  return ok(undefined);
}

/** Edit a saved result in place. `content` replaces the structured payload (the
 *  saved viz layout under `__viz` is preserved across the edit); `contentMd`
 *  replaces the rendered/markdown body. Pass only what changed. */
export async function updateArtifact(input: {
  artifactId: string;
  content?: Record<string, unknown>;
  contentMd?: string | null;
}): Promise<Result> {
  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");

  const patch: Record<string, unknown> = {};
  if (input.content !== undefined) {
    // Keep the drag-positioned viz layout (__viz) even if the editor sent it stripped.
    const { data: art } = await ctx.supabase
      .from("artifacts")
      .select("content")
      .eq("id", input.artifactId)
      .single();
    const prev =
      art?.content && typeof art.content === "object" && !Array.isArray(art.content)
        ? (art.content as Record<string, unknown>)
        : {};
    const next: Record<string, unknown> = { ...input.content };
    if (prev.__viz !== undefined && next.__viz === undefined) next.__viz = prev.__viz;
    patch.content = next;
  }
  if (input.contentMd !== undefined) patch.content_md = input.contentMd;
  if (Object.keys(patch).length === 0) return ok(undefined);

  const { error } = await ctx.supabase
    .from("artifacts")
    .update(patch)
    .eq("id", input.artifactId);
  if (error) return fail("FORBIDDEN", error.message);
  return ok(undefined);
}

/** Hard-delete a saved result. FK-safe: `reviews` cascade and
 *  `knowledge_entries.source_artifact_id` is set null, so a promoted KB entry
 *  survives (it just loses the back-link). RLS limits this to workspace members. */
export async function deleteArtifact(input: { artifactId: string }): Promise<Result> {
  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");
  const { error } = await ctx.supabase
    .from("artifacts")
    .delete()
    .eq("id", input.artifactId);
  if (error) return fail("FORBIDDEN", error.message);
  return ok(undefined);
}

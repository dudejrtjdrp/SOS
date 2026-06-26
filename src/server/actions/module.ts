"use server";

import { z } from "zod";
import { getAuthContext } from "@/server/auth";
import { ok, fail, type Result } from "@/lib/result";
import { formatExternalPrompt } from "@/core/prompt-engine/export-prompt";
import { buildVizPromptSpec } from "@/core/viz/input-schema";
import { manualRun, manualStructuredRun } from "@/server/engine";
import type { Variable } from "@/core/schemas/variables";
import type { VerificationStatus } from "@/types/db";

export async function createModule(input: {
  workspaceId: string;
  category: "idea" | "research" | "validation" | "analysis" | "document" | "custom";
  name: string;
  description?: string;
}): Promise<Result<{ moduleId: string; promptTemplateId: string }>> {
  const parsed = z
    .object({
      workspaceId: z.string().uuid(),
      category: z.enum(["idea", "research", "validation", "analysis", "document", "custom"]),
      name: z.string().min(1),
      description: z.string().optional(),
    })
    .safeParse(input);
  if (!parsed.success) return fail("VALIDATION", "모듈 이름을 입력하세요.");
  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");

  const { data: mod, error } = await ctx.supabase
    .from("modules")
    .insert({
      workspace_id: parsed.data.workspaceId,
      category: parsed.data.category,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      visibility: "private",
      created_by: ctx.user.id,
    })
    .select("id")
    .single();
  if (error) return fail("FORBIDDEN", error.message);

  const { data: tpl, error: tErr } = await ctx.supabase
    .from("prompt_templates")
    .insert({ module_id: mod.id, workspace_id: parsed.data.workspaceId, output_kind: "markdown" })
    .select("id")
    .single();
  if (tErr) return fail("INTERNAL", tErr.message);

  const { data: ver } = await ctx.supabase
    .from("prompt_versions")
    .insert({
      prompt_template_id: tpl.id,
      workspace_id: parsed.data.workspaceId,
      version: 1,
      system_prompt: "너는 유능한 어시스턴트다.",
      instructions: "사용자 입력과 Knowledge Base를 바탕으로 작성하라.",
      variables: [],
      output_format: {},
      examples: [],
      created_by: ctx.user.id,
    })
    .select("id")
    .single();
  await ctx.supabase.from("prompt_templates").update({ current_version_id: ver!.id }).eq("id", tpl.id);

  return ok({ moduleId: mod.id, promptTemplateId: tpl.id });
}

export async function savePromptVersion(input: {
  promptTemplateId: string;
  workspaceId: string;
  outputKind?: "structured" | "markdown" | "document";
  systemPrompt: string;
  instructions: string;
  variables: unknown[];
  outputFormat: Record<string, unknown>;
  examples?: unknown[];
  changelog?: string;
}): Promise<Result<{ versionId: string; version: number }>> {
  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");

  const { data: last } = await ctx.supabase
    .from("prompt_versions")
    .select("version")
    .eq("prompt_template_id", input.promptTemplateId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const version = (last?.version ?? 0) + 1;

  const { data: ver, error } = await ctx.supabase
    .from("prompt_versions")
    .insert({
      prompt_template_id: input.promptTemplateId,
      workspace_id: input.workspaceId,
      version,
      system_prompt: input.systemPrompt,
      instructions: input.instructions,
      variables: input.variables,
      output_format: input.outputFormat,
      examples: input.examples ?? [],
      changelog: input.changelog ?? null,
      created_by: ctx.user.id,
    })
    .select("id")
    .single();
  if (error) return fail("FORBIDDEN", error.message);

  await ctx.supabase
    .from("prompt_templates")
    .update({ current_version_id: ver.id, output_kind: input.outputKind ?? "markdown" })
    .eq("id", input.promptTemplateId);

  return ok({ versionId: ver.id, version });
}

/** Restore/rollback by moving the current pointer to an existing version. */
export async function setCurrentPromptVersion(input: {
  promptTemplateId: string;
  versionId: string;
}): Promise<Result> {
  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");
  const { error } = await ctx.supabase
    .from("prompt_templates")
    .update({ current_version_id: input.versionId })
    .eq("id", input.promptTemplateId);
  if (error) return fail("FORBIDDEN", error.message);
  return ok(undefined);
}

/** Share a module with the whole workspace (team template market). */
export async function publishModuleToWorkspace(input: { moduleId: string }): Promise<Result> {
  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");
  const { error } = await ctx.supabase
    .from("modules")
    .update({ visibility: "workspace" })
    .eq("id", input.moduleId);
  if (error) return fail("FORBIDDEN", error.message);
  return ok(undefined);
}

/**
 * Make a system tool's prompt editable. System modules (workspace_id NULL) are
 * world-readable but RLS-immutable, so "프롬프트 수정" forks the tool into a
 * workspace-owned "내 모듈" copy (its current prompt version copied verbatim) and
 * returns the new module id — the caller routes to its PromptBuilder.
 *
 * - The `key` is preserved so the fork keeps its visualization + guidance
 *   (the unique key index only constrains system rows; getModuleIdsByKeys keeps
 *   workflows pointed at the canonical system tool).
 * - Idempotent: a second "수정" on the same tool reopens the existing fork
 *   instead of piling up duplicates.
 * - Already-owned modules (private/workspace) need no fork — returns them as-is.
 */
export async function forkSystemModule(input: {
  projectId: string;
  moduleId: string;
}): Promise<Result<{ moduleId: string; forked: boolean }>> {
  const parsed = z
    .object({ projectId: z.string().uuid(), moduleId: z.string().uuid() })
    .safeParse(input);
  if (!parsed.success) return fail("VALIDATION", "입력을 확인하세요.");

  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");
  const sb = ctx.supabase;

  const { data: src } = await sb
    .from("modules")
    .select("id, key, name, description, category, icon, task_class, visibility")
    .eq("id", parsed.data.moduleId)
    .maybeSingle();
  if (!src) return fail("NOT_FOUND", "도구를 찾을 수 없습니다.");

  // Already user-owned → edit in place (no fork needed).
  if (src.visibility !== "system") return ok({ moduleId: src.id as string, forked: false });

  const { data: project } = await sb
    .from("projects")
    .select("workspace_id")
    .eq("id", parsed.data.projectId)
    .maybeSingle();
  const workspaceId = project?.workspace_id as string | undefined;
  if (!workspaceId) return fail("FORBIDDEN", "워크스페이스를 찾을 수 없습니다.");

  // Reuse an existing fork (same key, same workspace) so "수정" stays idempotent.
  if (src.key) {
    const { data: existing } = await sb
      .from("modules")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("key", src.key)
      .maybeSingle();
    if (existing?.id) return ok({ moduleId: existing.id as string, forked: false });
  }

  // Snapshot the source's current prompt version + output kind.
  const { data: tpl } = await sb
    .from("prompt_templates")
    .select("output_kind, current_version_id")
    .eq("module_id", src.id)
    .maybeSingle();
  const { data: pv } = tpl?.current_version_id
    ? await sb
        .from("prompt_versions")
        .select("system_prompt, instructions, variables, output_format, examples")
        .eq("id", tpl.current_version_id)
        .maybeSingle()
    : { data: null };

  const { data: mod, error: mErr } = await sb
    .from("modules")
    .insert({
      workspace_id: workspaceId,
      category: src.category,
      key: src.key, // preserve viz + guide
      name: src.name,
      description: src.description,
      icon: src.icon,
      task_class: src.task_class ?? "drafting",
      visibility: "private",
      created_by: ctx.user.id,
    })
    .select("id")
    .single();
  if (mErr) return fail("FORBIDDEN", mErr.message);

  const { data: newTpl, error: tErr } = await sb
    .from("prompt_templates")
    .insert({
      module_id: mod.id,
      workspace_id: workspaceId,
      output_kind: tpl?.output_kind ?? "markdown",
    })
    .select("id")
    .single();
  if (tErr) return fail("INTERNAL", tErr.message);

  const { data: ver } = await sb
    .from("prompt_versions")
    .insert({
      prompt_template_id: newTpl.id,
      workspace_id: workspaceId,
      version: 1,
      system_prompt: (pv?.system_prompt as string) ?? "너는 유능한 어시스턴트다.",
      instructions:
        (pv?.instructions as string) ?? "사용자 입력과 Knowledge Base를 바탕으로 작성하라.",
      variables: pv?.variables ?? [],
      output_format: pv?.output_format ?? {},
      examples: pv?.examples ?? [],
      changelog: "기본 도구에서 복제",
      created_by: ctx.user.id,
    })
    .select("id")
    .single();
  await sb.from("prompt_templates").update({ current_version_id: ver!.id }).eq("id", newTpl.id);

  return ok({ moduleId: mod.id as string, forked: true });
}

/**
 * Build a copy-pasteable prompt for running this module in an external AI.
 * Merges the current form inputs with the project's Knowledge Base, exactly
 * like a real run (minus RAG), and returns readable text. (docs/05 §3.2)
 */
export async function buildExternalPrompt(input: {
  projectId: string;
  moduleId: string;
  moduleKey?: string | null;
  inputs: Record<string, unknown>;
}): Promise<Result<{ prompt: string }>> {
  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");
  const sb = ctx.supabase;

  const { data: tpl } = await sb
    .from("prompt_templates")
    .select("current_version_id")
    .eq("module_id", input.moduleId)
    .maybeSingle();
  if (!tpl?.current_version_id) return fail("NOT_FOUND", "프롬프트를 찾을 수 없습니다.");

  const { data: pv } = await sb
    .from("prompt_versions")
    .select("system_prompt, instructions, variables, output_format, examples")
    .eq("id", tpl.current_version_id)
    .maybeSingle();
  if (!pv) return fail("NOT_FOUND", "프롬프트 버전을 찾을 수 없습니다.");

  const { data: kbRow } = await sb
    .from("knowledge_bases")
    .select("fields")
    .eq("project_id", input.projectId)
    .maybeSingle();
  const kb = (kbRow?.fields ?? {}) as Record<string, string>;

  const prompt = formatExternalPrompt({
    system: pv.system_prompt as string,
    instructions: pv.instructions as string,
    variables: (pv.variables ?? []) as Variable[],
    inputs: input.inputs ?? {},
    kb,
    outputFormat: pv.output_format,
    outputOverride: buildVizPromptSpec(input.moduleKey) ?? undefined,
    examples: pv.examples,
  });
  return ok({ prompt });
}

/**
 * Manual fallback (docs/05 §3.2): the user ran the copied prompt in an external
 * AI and pastes the result back. We persist it exactly like a normal run — best-
 * effort parsing structured tools into their schema, else markdown — so it flows
 * into the same artifact → verification → KB / document path. No LLM call.
 */
export async function submitExternalResult(input: {
  projectId: string;
  moduleId: string;
  inputs: Record<string, unknown>;
  text: string;
  workflowRunId?: string | null;
}): Promise<
  Result<{
    artifactId: string | null;
    verification: VerificationStatus;
    kind: "structured" | "markdown";
    content: unknown;
    contentMd: string;
  }>
> {
  const parsed = z
    .object({
      projectId: z.string().uuid(),
      moduleId: z.string().uuid(),
      text: z.string().min(1, "결과를 붙여넣어 주세요."),
      workflowRunId: z.string().uuid().nullable().optional(),
    })
    .safeParse({
      projectId: input.projectId,
      moduleId: input.moduleId,
      text: input.text,
      workflowRunId: input.workflowRunId,
    });
  if (!parsed.success)
    return fail("VALIDATION", parsed.error.issues[0]?.message ?? "입력을 확인하세요.");

  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");

  try {
    const r = await manualRun({
      supabase: ctx.supabase,
      userId: ctx.user.id,
      projectId: parsed.data.projectId,
      moduleId: parsed.data.moduleId,
      inputs: (input.inputs ?? {}) as Record<string, unknown>,
      text: parsed.data.text,
      workflowRunId: parsed.data.workflowRunId ?? null,
    });
    return ok({
      artifactId: r.artifactId,
      verification: r.verification,
      kind: r.kind,
      content: r.content,
      contentMd: r.contentMd,
    });
  } catch (e) {
    return fail("INTERNAL", e instanceof Error ? e.message : "결과 저장에 실패했습니다.");
  }
}

/**
 * AI-free structured result: the user filled a visualization's data fields by
 * hand. Persist the structured content directly (no text parsing) so it renders
 * as the tool's diagram and flows into the same KB / document path. (docs/05 §3.2)
 */
export async function submitStructuredResult(input: {
  projectId: string;
  moduleId: string;
  inputs?: Record<string, unknown>;
  content: Record<string, unknown>;
  /** Document-format prose to store as content_md (for KB / documents). */
  contentMd?: string;
}): Promise<Result<{ artifactId: string }>> {
  const parsed = z
    .object({
      projectId: z.string().uuid(),
      moduleId: z.string().uuid(),
    })
    .safeParse({ projectId: input.projectId, moduleId: input.moduleId });
  if (!parsed.success) return fail("VALIDATION", "입력을 확인하세요.");
  if (!input.content || typeof input.content !== "object" || Array.isArray(input.content)) {
    return fail("VALIDATION", "시각화에 넣을 데이터를 입력하세요.");
  }

  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");

  try {
    const r = await manualStructuredRun({
      supabase: ctx.supabase,
      userId: ctx.user.id,
      projectId: parsed.data.projectId,
      moduleId: parsed.data.moduleId,
      inputs: input.inputs ?? {},
      content: input.content,
      contentMd: input.contentMd,
    });
    if (!r.artifactId) {
      return fail(
        "INTERNAL",
        "결과가 저장되지 않았어요. DB 설정(마이그레이션 0008)을 확인하거나 다시 시도해 주세요.",
      );
    }
    return ok({ artifactId: r.artifactId });
  } catch (e) {
    return fail("INTERNAL", e instanceof Error ? e.message : "저장에 실패했습니다.");
  }
}

"use server";

import { z } from "zod";
import { getAuthContext } from "@/server/auth";
import { ok, fail, type Result } from "@/lib/result";
import { formatExternalPrompt } from "@/core/prompt-engine/export-prompt";
import { manualRun } from "@/server/engine";
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
 * Build a copy-pasteable prompt for running this module in an external AI.
 * Merges the current form inputs with the project's Knowledge Base, exactly
 * like a real run (minus RAG), and returns readable text. (docs/05 §3.2)
 */
export async function buildExternalPrompt(input: {
  projectId: string;
  moduleId: string;
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

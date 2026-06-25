import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { streamObject, streamText, generateObject, generateText } from "ai";
import type { ModelMessage } from "ai";
import { model } from "@/core/ai";
import { buildRunPlan, parseExternalResult, type RunPlan } from "@/core/prompt-engine";
import { retrieve, indexSource } from "@/core/rag";
import type {
  KBFields,
  Variable,
  OutputFormat,
  RagSource,
} from "@/core/schemas";
import type { ArtifactKind, ModuleCategory, TaskClass, VerificationStatus } from "@/types/db";

interface RunOptions {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  moduleId: string;
  inputs: Record<string, unknown>;
  useRag: boolean;
  workflowRunId?: string | null;
  /** Manual run: result pasted from an external AI, no LLM call. */
  manual?: boolean;
}

interface LoadedContext {
  workspaceId: string;
  outputKind: "structured" | "markdown" | "document";
  category: ModuleCategory;
  plan: RunPlan;
  promptVersionId: string;
  sources: RagSource[];
}

function artifactKind(category: ModuleCategory): ArtifactKind {
  switch (category) {
    case "idea":
      return "idea";
    case "research":
      return "research";
    case "validation":
      return "validation";
    case "document":
      return "document_section";
    default:
      return "analysis";
  }
}

function verificationFor(category: ModuleCategory): VerificationStatus {
  // HITL (docs/08 §3): research figures, customer validation, and documents
  // are born needs_review — a human must pass them before they move on.
  return category === "research" || category === "validation" || category === "document"
    ? "needs_review"
    : "ai_draft";
}

function tokensOf(usage: unknown): { in: number; out: number } {
  const u = (usage ?? {}) as Record<string, number | undefined>;
  return {
    in: u.inputTokens ?? u.promptTokens ?? 0,
    out: u.outputTokens ?? u.completionTokens ?? 0,
  };
}

/** Steps 1-4: load template + KB, retrieve RAG context, build the run plan. */
export async function loadRunContext(
  supabase: SupabaseClient,
  projectId: string,
  moduleId: string,
  inputs: Record<string, unknown>,
  useRag: boolean,
): Promise<LoadedContext> {
  const [{ data: project }, { data: kbRow }, { data: mod }, { data: tpl }] =
    await Promise.all([
      supabase.from("projects").select("workspace_id").eq("id", projectId).single(),
      supabase.from("knowledge_bases").select("fields").eq("project_id", projectId).single(),
      supabase.from("modules").select("task_class, category").eq("id", moduleId).single(),
      supabase
        .from("prompt_templates")
        .select("output_kind, current_version_id")
        .eq("module_id", moduleId)
        .maybeSingle(),
    ]);

  if (!project) throw new Error("project not found");
  if (!tpl?.current_version_id) throw new Error("module has no published prompt version");

  const { data: pv } = await supabase
    .from("prompt_versions")
    .select("*")
    .eq("id", tpl.current_version_id)
    .single();
  if (!pv) throw new Error("prompt version not found");

  const kb = (kbRow?.fields ?? {}) as KBFields;

  let ragChunks: { content: string; label: string }[] = [];
  let sources: RagSource[] = [];
  if (useRag) {
    const query = [kb.service_description, kb.market, kb.problem, JSON.stringify(inputs)]
      .filter(Boolean)
      .join(" ")
      .slice(0, 1000);
    const r = await retrieve(supabase, projectId, query);
    ragChunks = r.chunks;
    sources = r.sources;
  }

  // Only treat object-shaped output_format as a structured schema.
  const of = pv.output_format as { fields?: unknown } | null;
  const outputFormat =
    of && of.fields ? (pv.output_format as OutputFormat) : null;

  const plan = buildRunPlan({
    taskClass: mod?.task_class as TaskClass,
    systemPrompt: pv.system_prompt,
    instructions: pv.instructions,
    variables: (pv.variables ?? []) as Variable[],
    outputFormat,
    examples: (pv.examples ?? []) as { input?: string; output?: string }[],
    modelPolicy: pv.model_policy,
    userInputs: inputs,
    kb,
    ragChunks,
  });

  return {
    workspaceId: project.workspace_id,
    outputKind: tpl.output_kind,
    category: mod?.category as ModuleCategory,
    plan,
    promptVersionId: pv.id,
    sources,
  };
}

/** Insert a run row in `running` state. */
async function createRun(o: RunOptions, ctx: LoadedContext): Promise<string> {
  const { data } = await o.supabase
    .from("runs")
    .insert({
      workspace_id: ctx.workspaceId,
      project_id: o.projectId,
      module_id: o.moduleId,
      prompt_version_id: ctx.promptVersionId,
      status: "running",
      inputs: o.inputs,
      rag_sources: ctx.sources,
      model: o.manual ? "manual" : ctx.plan.modelId,
      created_by: o.userId,
      workflow_run_id: o.workflowRunId ?? null,
    })
    .select("id")
    .single();
  return data!.id as string;
}

/** Persist the artifact, finalize the run, wire provenance edges + embedding. */
async function persist(
  o: RunOptions,
  ctx: LoadedContext,
  runId: string,
  content: unknown,
  contentMd: string | null,
  usage: unknown,
): Promise<string | null> {
  const { data: art } = await o.supabase
    .from("artifacts")
    .insert({
      workspace_id: ctx.workspaceId,
      project_id: o.projectId,
      run_id: runId,
      module_id: o.moduleId,
      kind: artifactKind(ctx.category),
      // Manual (user-pasted/typed) results are the human's own input — there is no
      // app-generated AI output to review — so they're stored already verified,
      // skipping the human-review gate.
      verification_status: o.manual ? "human_verified" : verificationFor(ctx.category),
      ...(o.manual ? { verified_by: o.userId, verified_at: new Date().toISOString() } : {}),
      content: content ?? {},
      content_md: contentMd,
      created_by: o.userId,
    })
    .select("id")
    .single();

  const t = tokensOf(usage);
  await o.supabase
    .from("runs")
    .update({
      status: "succeeded",
      tokens_in: t.in,
      tokens_out: t.out,
      finished_at: new Date().toISOString(),
    })
    .eq("id", runId);

  if (art && ctx.sources.length) {
    await o.supabase.from("graph_edges").insert(
      ctx.sources.map((s) => ({
        workspace_id: ctx.workspaceId,
        project_id: o.projectId,
        from_type: "artifact",
        from_id: art.id,
        to_type: s.sourceType,
        to_id: s.sourceId,
        relation: "cites",
      })),
    );
  }

  // Index the new artifact so future runs can ground on it (best-effort).
  if (art && contentMd) {
    try {
      await indexSource(o.supabase, {
        workspaceId: ctx.workspaceId,
        projectId: o.projectId,
        sourceType: "artifact",
        sourceId: art.id,
        text: contentMd,
      });
    } catch {
      /* embedding failure must not fail the run */
    }
  }
  return art?.id ?? null;
}

async function markFailed(o: RunOptions, runId: string, message: string) {
  await o.supabase
    .from("runs")
    .update({ status: "failed", error: message, finished_at: new Date().toISOString() })
    .eq("id", runId);
}

/** Interactive streaming run (used by POST /api/runs). */
export async function streamRun(o: RunOptions) {
  const ctx = await loadRunContext(o.supabase, o.projectId, o.moduleId, o.inputs, o.useRag);
  const runId = await createRun(o, ctx);
  const headers = {
    "x-run-id": runId,
    "x-sources": encodeURIComponent(JSON.stringify(ctx.sources)),
  };

  if (ctx.outputKind === "structured" && ctx.plan.outputZod) {
    const result = streamObject({
      model: model(ctx.plan.modelId),
      schema: ctx.plan.outputZod,
      messages: ctx.plan.messages as ModelMessage[],
      temperature: ctx.plan.temperature,
      onFinish: async ({ object, usage, error }) => {
        if (error || object === undefined) {
          await markFailed(o, runId, String(error ?? "no object"));
          return;
        }
        await persist(o, ctx, runId, object, JSON.stringify(object, null, 2), usage);
      },
    });
    return { runId, response: result.toTextStreamResponse({ headers }) };
  }

  const result = streamText({
    model: model(ctx.plan.modelId),
    messages: ctx.plan.messages as ModelMessage[],
    temperature: ctx.plan.temperature,
    onFinish: async ({ text, usage }) => {
      await persist(o, ctx, runId, { markdown: text }, text, usage);
    },
    onError: async ({ error }) => {
      await markFailed(o, runId, String(error));
    },
  });
  return { runId, response: result.toTextStreamResponse({ headers }) };
}

/** Non-streaming run (used by document generation, reviewer, workflows). */
export async function runOnce(o: RunOptions): Promise<{
  runId: string;
  artifactId: string | null;
  content: unknown;
  contentMd: string;
}> {
  const ctx = await loadRunContext(o.supabase, o.projectId, o.moduleId, o.inputs, o.useRag);
  const runId = await createRun(o, ctx);
  try {
    if (ctx.outputKind === "structured" && ctx.plan.outputZod) {
      const { object, usage } = await generateObject({
        model: model(ctx.plan.modelId),
        schema: ctx.plan.outputZod,
        messages: ctx.plan.messages as ModelMessage[],
        temperature: ctx.plan.temperature,
      });
      const md = JSON.stringify(object, null, 2);
      const artifactId = await persist(o, ctx, runId, object, md, usage);
      return { runId, artifactId, content: object, contentMd: md };
    }
    const { text, usage } = await generateText({
      model: model(ctx.plan.modelId),
      messages: ctx.plan.messages as ModelMessage[],
      temperature: ctx.plan.temperature,
    });
    const artifactId = await persist(o, ctx, runId, { markdown: text }, text, usage);
    return { runId, artifactId, content: { markdown: text }, contentMd: text };
  } catch (e) {
    await markFailed(o, runId, e instanceof Error ? e.message : String(e));
    throw e;
  }
}

/**
 * Manual run: skip the LLM and persist a result the user produced in an external
 * AI (after copying the prompt). Reuses the same context build + persistence as
 * a normal run, so the artifact flows into the identical verification → KB /
 * document path. RAG is off (the external prompt isn't RAG-grounded).
 */
export async function manualRun(args: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  moduleId: string;
  inputs: Record<string, unknown>;
  text: string;
  workflowRunId?: string | null;
}): Promise<{
  runId: string;
  artifactId: string | null;
  verification: VerificationStatus;
  kind: "structured" | "markdown";
  content: unknown;
  contentMd: string;
}> {
  const o: RunOptions = {
    supabase: args.supabase,
    userId: args.userId,
    projectId: args.projectId,
    moduleId: args.moduleId,
    inputs: args.inputs,
    useRag: false,
    workflowRunId: args.workflowRunId ?? null,
    manual: true,
  };
  const ctx = await loadRunContext(o.supabase, o.projectId, o.moduleId, o.inputs, false);
  const runId = await createRun(o, ctx);
  try {
    const parsed = parseExternalResult(args.text, {
      structured: ctx.outputKind === "structured",
      zod: ctx.plan.outputZod ?? null,
    });
    const artifactId = await persist(o, ctx, runId, parsed.content, parsed.contentMd, null);
    return {
      runId,
      artifactId,
      verification: "human_verified",
      kind: parsed.kind,
      content: parsed.content,
      contentMd: parsed.contentMd,
    };
  } catch (e) {
    await markFailed(o, runId, e instanceof Error ? e.message : String(e));
    throw e;
  }
}

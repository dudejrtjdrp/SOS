"use server";

import { z } from "zod";
import { getAuthContext } from "@/server/auth";
import { ok, fail, type Result } from "@/lib/result";
import { assembleDocumentMarkdown } from "@/core/documents/compose";
import { formatDocumentPrompt, formatReviewPrompt } from "@/core/documents/export-prompt";
import { KB_FIELD_LABEL } from "@/core/modules/guide";

const SectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  artifactId: z.string().uuid().optional(),
  body_md: z.string().optional(),
});

/** Append a new immutable document version and move the current pointer. */
export async function saveDocumentVersion(input: {
  documentId: string;
  sections: z.infer<typeof SectionSchema>[];
  /** Optional new document title (inline editor); leaves it unchanged if absent. */
  title?: string;
}): Promise<Result<{ versionId: string; version: number }>> {
  const parsed = z
    .object({
      documentId: z.string().uuid(),
      sections: z.array(SectionSchema).min(1, "최소 한 개의 섹션이 필요합니다."),
      title: z.string().trim().min(1).optional(),
    })
    .safeParse(input);
  if (!parsed.success)
    return fail("VALIDATION", parsed.error.issues[0]?.message ?? "섹션 형식이 올바르지 않습니다.");
  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");

  const { data: doc } = await ctx.supabase
    .from("documents")
    .select("workspace_id")
    .eq("id", parsed.data.documentId)
    .single();
  if (!doc) return fail("NOT_FOUND", "문서를 찾을 수 없습니다.");

  const { data: last } = await ctx.supabase
    .from("document_versions")
    .select("version")
    .eq("document_id", parsed.data.documentId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const version = (last?.version ?? 0) + 1;

  const body_md = parsed.data.sections
    .map((s) => `## ${s.title}\n\n${s.body_md ?? ""}`)
    .join("\n\n");

  const { data: ver, error } = await ctx.supabase
    .from("document_versions")
    .insert({
      document_id: parsed.data.documentId,
      workspace_id: doc.workspace_id,
      version,
      sections: parsed.data.sections,
      body_md,
      created_by: ctx.user.id,
    })
    .select("id")
    .single();
  if (error) return fail("INTERNAL", error.message);

  await ctx.supabase
    .from("documents")
    .update({
      current_version_id: ver.id,
      ...(parsed.data.title ? { title: parsed.data.title } : {}),
    })
    .eq("id", parsed.data.documentId);

  return ok({ versionId: ver.id, version });
}

/**
 * Manual document composer (docs/04 §4.2 — manual path). Creates a NEW document +
 * version 1 from ordered blocks the user picked from tool artifacts and edited.
 * Mirrors generateDocument()'s persistence exactly — but no LLM call. The AI-free
 * alternative to one-click generation; also the workflow doc-step fallback when
 * generation is rate-limited.
 */
export async function composeManualDocument(input: {
  projectId: string;
  title: string;
  blocks: { id?: string; title: string; body_md: string }[];
}): Promise<Result<{ documentId: string; versionId: string }>> {
  const parsed = z
    .object({
      projectId: z.string().uuid(),
      title: z.string().min(1, "문서 제목을 입력하세요."),
      blocks: z
        .array(
          z.object({
            id: z.string().optional(),
            title: z.string().min(1, "섹션 제목을 입력하세요."),
            body_md: z.string(),
          }),
        )
        .min(1, "최소 한 개의 섹션을 추가하세요."),
    })
    .safeParse(input);
  if (!parsed.success)
    return fail("VALIDATION", parsed.error.issues[0]?.message ?? "입력을 확인하세요.");

  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");
  const sb = ctx.supabase;

  const { data: project } = await sb
    .from("projects")
    .select("workspace_id")
    .eq("id", parsed.data.projectId)
    .single();
  if (!project) return fail("NOT_FOUND", "프로젝트를 찾을 수 없습니다.");

  const sections = parsed.data.blocks.map((b, i) => ({
    id: b.id ?? `sec-${i + 1}`,
    title: b.title,
    body_md: b.body_md,
  }));
  const body_md = assembleDocumentMarkdown(parsed.data.blocks);

  const { data: doc, error: dErr } = await sb
    .from("documents")
    .insert({
      workspace_id: project.workspace_id,
      project_id: parsed.data.projectId,
      doc_type: "manual",
      title: parsed.data.title,
      created_by: ctx.user.id,
    })
    .select("id")
    .single();
  if (dErr || !doc) return fail("INTERNAL", dErr?.message ?? "문서 생성에 실패했습니다.");

  const { data: ver, error: vErr } = await sb
    .from("document_versions")
    .insert({
      document_id: doc.id,
      workspace_id: project.workspace_id,
      version: 1,
      sections,
      body_md,
      created_by: ctx.user.id,
    })
    .select("id")
    .single();
  if (vErr || !ver) return fail("INTERNAL", vErr?.message ?? "문서 버전 생성에 실패했습니다.");

  await sb.from("documents").update({ current_version_id: ver.id }).eq("id", doc.id);

  return ok({ documentId: doc.id, versionId: ver.id });
}

/**
 * AI-free document path (copy side). Builds one copy-pasteable prompt that
 * reproduces one-click generation for `docType` in an external AI: the doc
 * module's system prompt + the project's non-empty Knowledge Base + the ordered
 * section plan, formatted by formatDocumentPrompt(). The team runs it in
 * ChatGPT/Claude, then pastes the markdown into 직접 조립 (manual composer) or
 * saves it as .md. No LLM call here.
 */
export async function buildDocumentExternalPrompt(input: {
  projectId: string;
  docType: string;
  language?: string;
}): Promise<Result<{ prompt: string; docName: string }>> {
  const parsed = z
    .object({
      projectId: z.string().uuid(),
      docType: z.string().min(1),
      language: z.string().optional(),
    })
    .safeParse(input);
  if (!parsed.success) return fail("VALIDATION", "입력이 올바르지 않습니다.");

  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");
  const sb = ctx.supabase;

  const { data: mod } = await sb
    .from("modules")
    .select("id, name")
    .eq("key", parsed.data.docType)
    .eq("category", "document")
    .maybeSingle();
  if (!mod) return fail("NOT_FOUND", "문서 종류를 찾을 수 없습니다.");

  const { data: tpl } = await sb
    .from("prompt_templates")
    .select("current_version_id")
    .eq("module_id", mod.id)
    .maybeSingle();
  if (!tpl?.current_version_id) return fail("NOT_FOUND", "문서 프롬프트를 찾을 수 없습니다.");

  const { data: pv } = await sb
    .from("prompt_versions")
    .select("system_prompt, output_format")
    .eq("id", tpl.current_version_id)
    .maybeSingle();
  if (!pv) return fail("NOT_FOUND", "문서 프롬프트 버전을 찾을 수 없습니다.");

  const { data: kbRow } = await sb
    .from("knowledge_bases")
    .select("fields")
    .eq("project_id", parsed.data.projectId)
    .maybeSingle();
  const kbFields = (kbRow?.fields ?? {}) as Record<string, unknown>;

  const rawSections = ((pv.output_format as { sections?: unknown } | null)?.sections ??
    []) as { title?: string; instruction?: string }[];
  const sections = rawSections.map((s) => ({
    title: s.title ?? "",
    instruction: s.instruction ?? "",
  }));

  const kb = Object.entries(kbFields)
    .filter(([, v]) => typeof v === "string" && v.trim() !== "")
    .map(([k, v]) => ({ label: KB_FIELD_LABEL[k] ?? k, value: String(v).trim() }));

  const prompt = formatDocumentPrompt({
    docName: mod.name as string,
    system: (pv.system_prompt as string) ?? "",
    sections,
    kb,
    language: parsed.data.language ?? "ko",
  });

  return ok({ prompt, docName: mod.name as string });
}

/**
 * AI-free review path (copy side). Builds a copy-pasteable multi-persona review
 * prompt for a document's current version, to run in an external AI instead of
 * the in-app reviewer. No LLM call.
 */
export async function buildReviewPrompt(input: {
  documentId: string;
}): Promise<Result<{ prompt: string; docName: string }>> {
  const parsed = z.object({ documentId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return fail("VALIDATION", "입력이 올바르지 않습니다.");

  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");
  const sb = ctx.supabase;

  const { data: doc } = await sb
    .from("documents")
    .select("title, current_version_id")
    .eq("id", parsed.data.documentId)
    .maybeSingle();
  if (!doc?.current_version_id) return fail("NOT_FOUND", "문서를 찾을 수 없습니다.");

  const { data: ver } = await sb
    .from("document_versions")
    .select("body_md")
    .eq("id", doc.current_version_id)
    .maybeSingle();
  const content = String(ver?.body_md ?? "").slice(0, 12000);
  if (!content.trim()) return fail("NOT_FOUND", "리뷰할 문서 내용이 없습니다.");

  const docName = (doc.title as string) ?? "문서";
  return ok({ prompt: formatReviewPrompt({ docName, content }), docName });
}

"use server";

import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthContext } from "@/server/auth";
import { ok, fail, type Result } from "@/lib/result";
import { artifactToMarkdown } from "@/core/documents/compose";
import { formatComposePrompt, type ComposeMaterial } from "@/core/documents/compose-prompt";
import { KB_FIELD_LABEL } from "@/core/modules/guide";

const MAX_MATERIALS = 14;
const MAX_BODY = 1800;

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null;
}

/** Project artifacts (non-rejected) rendered as 분석 자료 for the assembly prompt. */
async function loadMaterials(sb: SupabaseClient, projectId: string): Promise<ComposeMaterial[]> {
  const { data } = await sb
    .from("artifacts")
    .select("kind, content, content_md, verification_status, module:modules(name)")
    .eq("project_id", projectId)
    .neq("verification_status", "rejected")
    .order("created_at", { ascending: false })
    .limit(MAX_MATERIALS);
  return (data ?? []).map((a) => {
    const mod = one<{ name: string }>(a.module as never);
    const body = artifactToMarkdown(a.content, (a.content_md as string | null) ?? null);
    return {
      label: mod?.name ?? "도구 결과",
      body: body.length > MAX_BODY ? body.slice(0, MAX_BODY) + "\n…(생략)" : body,
    };
  });
}

async function loadKB(sb: SupabaseClient, projectId: string) {
  const { data } = await sb.from("knowledge_bases").select("fields").eq("project_id", projectId).maybeSingle();
  const fields = (data?.fields ?? {}) as Record<string, unknown>;
  return Object.entries(fields)
    .filter(([, v]) => typeof v === "string" && v.trim() !== "")
    .map(([k, v]) => ({ label: KB_FIELD_LABEL[k] ?? k, value: String(v).trim() }));
}

/**
 * 직접 조립 — copy-prompt for a target document. Builds a prompt that embeds the
 * project's saved tool results (분석 자료) + Knowledge Base + the document's
 * section plan, so an external AI assembles them into «docType».
 */
export async function buildComposePrompt(input: {
  projectId: string;
  docType: string;
  language?: string;
}): Promise<Result<{ prompt: string; docName: string }>> {
  const parsed = z
    .object({ projectId: z.string().uuid(), docType: z.string().min(1), language: z.string().optional() })
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
  const { data: pv } = tpl?.current_version_id
    ? await sb
        .from("prompt_versions")
        .select("system_prompt, output_format")
        .eq("id", tpl.current_version_id)
        .maybeSingle()
    : { data: null };

  const rawSections = ((pv?.output_format as { sections?: unknown } | null)?.sections ?? []) as {
    title?: string;
    instruction?: string;
  }[];
  const sections = rawSections.map((s) => ({ title: s.title ?? "", instruction: s.instruction ?? "" }));

  const [materials, kb] = await Promise.all([
    loadMaterials(sb, parsed.data.projectId),
    loadKB(sb, parsed.data.projectId),
  ]);

  const prompt = formatComposePrompt({
    docName: mod.name as string,
    system: (pv?.system_prompt as string) ?? "",
    sections,
    kb,
    materials,
    language: parsed.data.language ?? "ko",
  });
  return ok({ prompt, docName: mod.name as string });
}

/**
 * 직접 조립 — manual mode (no template). Builds a prompt that asks the external
 * AI to organize the project's saved tool results into one clean document.
 */
export async function buildOrganizePrompt(input: {
  projectId: string;
  language?: string;
}): Promise<Result<{ prompt: string }>> {
  const parsed = z
    .object({ projectId: z.string().uuid(), language: z.string().optional() })
    .safeParse(input);
  if (!parsed.success) return fail("VALIDATION", "입력이 올바르지 않습니다.");

  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");
  const sb = ctx.supabase;

  const [materials, kb] = await Promise.all([
    loadMaterials(sb, parsed.data.projectId),
    loadKB(sb, parsed.data.projectId),
  ]);

  const prompt = formatComposePrompt({
    docName: "정리 문서",
    system: "",
    sections: [],
    kb,
    materials,
    language: parsed.data.language ?? "ko",
    organizeOnly: true,
  });
  return ok({ prompt });
}

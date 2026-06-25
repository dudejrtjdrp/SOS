import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateText } from "ai";
import type { ModelMessage } from "ai";
import { model, selectModel } from "@/core/ai";
import { retrieve } from "@/core/rag";
import type { KBFields } from "@/core/schemas";

interface DocSectionDef {
  key: string;
  title: string;
  instruction: string;
  module_key?: string;
}

type Messages = ModelMessage[];

/**
 * One-click document generation (docs/04 §4.2). Loads the document module's
 * section plan, drafts every section in parallel from the Knowledge Base,
 * assembles markdown, and saves document + version 1.
 */
export async function generateDocument(
  supabase: SupabaseClient,
  userId: string,
  params: { projectId: string; docType: string; preset?: string; language?: string },
) {
  const { data: project } = await supabase
    .from("projects")
    .select("workspace_id")
    .eq("id", params.projectId)
    .single();
  if (!project) throw new Error("project not found");

  const { data: kbRow } = await supabase
    .from("knowledge_bases")
    .select("fields")
    .eq("project_id", params.projectId)
    .single();
  const kb = (kbRow?.fields ?? {}) as KBFields;

  const { data: mod } = await supabase
    .from("modules")
    .select("id, name")
    .eq("key", params.docType)
    .eq("category", "document")
    .maybeSingle();
  if (!mod) throw new Error(`unknown document type: ${params.docType}`);

  const { data: tpl } = await supabase
    .from("prompt_templates")
    .select("current_version_id")
    .eq("module_id", mod.id)
    .maybeSingle();
  const { data: pv } = await supabase
    .from("prompt_versions")
    .select("system_prompt, output_format")
    .eq("id", tpl?.current_version_id)
    .single();

  const sections = ((pv?.output_format?.sections ?? []) as DocSectionDef[]);
  const kbText = JSON.stringify(kb);
  const lang = params.language ?? "ko";
  const { modelId, temperature } = selectModel("drafting");

  const generated = await Promise.all(
    sections.map(async (sec) => {
      // Ground each section in the project's prior analysis (workflow artifacts,
      // KB entries, earlier documents) via RAG so the document builds on the
      // pipeline that produced it rather than the Knowledge Base alone.
      const query = [sec.title, sec.instruction, kb.service_description, kb.market]
        .filter(Boolean)
        .join(" ")
        .slice(0, 1000);
      let chunks: { content: string; label: string }[] = [];
      try {
        ({ chunks } = await retrieve(supabase, params.projectId, query, 6));
      } catch {
        /* retrieval must never block document generation */
      }
      const grounding = chunks.length
        ? `\n\n<관련_분석>\n${chunks
            .map((c, i) => `[${c.label} ${i + 1}] ${c.content}`)
            .join("\n\n")}\n</관련_분석>\n` +
          `위 분석 자료를 우선 근거로 활용하라. 자료에 없는 수치·사실은 지어내지 말고 추정임을 명시한다.`
        : "";

      const messages = [
        { role: "system", content: `${pv?.system_prompt ?? ""}\n출력 언어: ${lang}` },
        {
          role: "user",
          content:
            `<knowledge_base>\n${kbText}\n</knowledge_base>` +
            grounding +
            `\n\n다음 섹션을 작성하라.\n제목: ${sec.title}\n지침: ${sec.instruction}\n\n` +
            `마크다운 본문만 출력하라(섹션 제목 헤더는 제외).`,
        },
      ] as Messages;
      const { text } = await generateText({
        model: model(modelId),
        messages,
        temperature,
      });
      return { key: sec.key, title: sec.title, body_md: text };
    }),
  );

  const body_md = generated.map((s) => `## ${s.title}\n\n${s.body_md}`).join("\n\n");

  const { data: doc } = await supabase
    .from("documents")
    .insert({
      workspace_id: project.workspace_id,
      project_id: params.projectId,
      doc_type: params.docType,
      preset: params.preset ?? null,
      title: mod.name,
      created_by: userId,
    })
    .select("id")
    .single();

  const { data: ver } = await supabase
    .from("document_versions")
    .insert({
      document_id: doc!.id,
      workspace_id: project.workspace_id,
      version: 1,
      sections: generated.map((s) => ({ id: s.key, title: s.title, body_md: s.body_md })),
      body_md,
      created_by: userId,
    })
    .select("id")
    .single();

  await supabase
    .from("documents")
    .update({ current_version_id: ver!.id })
    .eq("id", doc!.id);

  return { documentId: doc!.id, versionId: ver!.id, title: mod.name, body_md };
}

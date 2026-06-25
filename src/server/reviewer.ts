import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateObject } from "ai";
import type { ModelMessage } from "ai";
import { z } from "zod";
import { model, selectModel } from "@/core/ai";
import type { ReviewPersona } from "@/types/db";

type Messages = ModelMessage[];

const PERSONA: Record<ReviewPersona, string> = {
  investor:
    "너는 깐깐한 초기투자 심사역이다. 시장성·수익성·팀·리스크·투자 매력도 관점에서 냉정하고 구체적으로 평가한다.",
  judge:
    "너는 정부지원사업·공모전 심사위원이다. 평가 기준 부합도·명확성·실현 가능성 관점에서 평가한다.",
  customer:
    "너는 이 서비스의 타겟 고객이다. 가치 제안 공감도와 실제 지불 의사 관점에서 솔직하게 평가한다.",
  competitor:
    "너는 경쟁사 전략가다. 차별성의 취약점과 모방 가능성 관점에서 비판적으로 평가한다.",
};

const ReviewSchema = z.object({
  score: z.number().min(0).max(10),
  strengths: z.array(z.string()).min(1),
  weaknesses: z.array(z.string()).min(1),
  suggestions: z.array(z.string()).min(1),
});

/** AI Reviewer (docs/05 §7): evaluate a target from multiple personas. */
export async function runReview(
  supabase: SupabaseClient,
  _userId: string,
  params: {
    targetType: "artifact" | "document";
    targetId: string;
    personas: ReviewPersona[];
  },
) {
  let content = "";
  let workspaceId = "";
  let projectId: string | null = null;

  if (params.targetType === "artifact") {
    const { data } = await supabase
      .from("artifacts")
      .select("content_md, content, workspace_id, project_id")
      .eq("id", params.targetId)
      .single();
    if (!data) throw new Error("artifact not found");
    content = data.content_md ?? JSON.stringify(data.content);
    workspaceId = data.workspace_id;
    projectId = data.project_id;
  } else {
    const { data: doc } = await supabase
      .from("documents")
      .select("workspace_id, project_id, current_version_id")
      .eq("id", params.targetId)
      .single();
    if (!doc) throw new Error("document not found");
    workspaceId = doc.workspace_id;
    projectId = doc.project_id;
    const { data: ver } = await supabase
      .from("document_versions")
      .select("body_md")
      .eq("id", doc.current_version_id)
      .single();
    content = ver?.body_md ?? "";
  }

  const { modelId, temperature } = selectModel("reasoning");

  const reviews = await Promise.all(
    params.personas.map(async (persona) => {
      const messages = [
        { role: "system", content: `${PERSONA[persona]} 출력은 한국어. 점수는 0~10.` },
        {
          role: "user",
          content: `다음 산출물을 평가하라.\n\n<content>\n${content.slice(0, 12000)}\n</content>`,
        },
      ] as Messages;

      const { object } = await generateObject({
        model: model(modelId),
        schema: ReviewSchema,
        messages,
        temperature,
      });

      await supabase.from("reviews").insert({
        workspace_id: workspaceId,
        project_id: projectId,
        artifact_id: params.targetType === "artifact" ? params.targetId : null,
        document_id: params.targetType === "document" ? params.targetId : null,
        persona,
        score: object.score,
        strengths: object.strengths,
        weaknesses: object.weaknesses,
        suggestions: object.suggestions,
      });

      return { persona, ...object };
    }),
  );

  return reviews;
}

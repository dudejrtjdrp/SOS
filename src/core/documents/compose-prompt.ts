/**
 * Pure formatter for 직접 조립 (manual document assembly). Unlike
 * formatDocumentPrompt (KB-only), this embeds the **tool-derived results**
 * (artifacts) as 분석 자료 so an external AI can assemble them into the target
 * document — the whole point of "조립". Two shapes:
 *
 *   • workflow/doc target → write «docName» from the materials + KB, following
 *     the document's section plan.
 *   • organizeOnly (no template) → just tidy the materials into one clean doc.
 *
 * No LLM, no DB, no React.
 */

const LANG: Record<string, string> = { ko: "한국어", en: "English", ja: "日本語" };

export interface ComposeMaterial {
  label: string;
  body: string;
}
export interface ComposePromptSection {
  title: string;
  instruction: string;
}
export interface ComposeKBEntry {
  label: string;
  value: string;
}

export function formatComposePrompt(i: {
  docName: string;
  system: string;
  sections: ComposePromptSection[];
  kb: ComposeKBEntry[];
  materials: ComposeMaterial[];
  language?: string;
  organizeOnly?: boolean;
}): string {
  const lang = LANG[i.language ?? "ko"] ?? i.language ?? "한국어";
  const lines: string[] = [];

  const role =
    (i.system ?? "").trim() ||
    "너는 창업 자료를 구조적으로 정리하는 전문 에디터다. 근거 기반으로 명확하게 정리한다.";
  lines.push("[역할]", role, "");

  if (i.organizeOnly) {
    lines.push(
      "[작업]",
      "아래 ‘분석 자료’를 하나의 깔끔한 문서로 정리하세요. 비슷한 내용은 합치고, 논리적인 순서로 묶고, 마크다운 ## 머리말로 섹션을 나눕니다. 자료에 없는 내용은 지어내지 말고, 부족한 부분은 ‘추가 필요’로 표시하세요.",
      `출력 언어: ${lang}`,
      "",
    );
  } else {
    lines.push(
      "[작업]",
      `아래 ‘분석 자료’(도구로 도출한 결과)와 Knowledge Base를 근거로 「${i.docName}」 문서를 작성하세요.`,
      "자료의 분석을 적극 반영하고, 각 섹션을 지정된 제목의 마크다운 ## 머리말로 작성합니다.",
      "자료에 없는 수치·사실은 지어내지 말고 추정임을 명시하세요.",
      `출력 언어: ${lang}`,
      "",
    );
  }

  if (i.kb.length) {
    lines.push("[Knowledge Base]");
    for (const e of i.kb) lines.push(`- ${e.label}: ${e.value}`);
    lines.push("");
  }

  lines.push("[분석 자료] (도구 결과)");
  if (i.materials.length) {
    i.materials.forEach((m) => {
      lines.push(`### ${m.label}`, (m.body ?? "").trim() || "(내용 없음)", "");
    });
  } else {
    lines.push("(아직 저장된 도구 결과가 없습니다. Knowledge Base를 근거로 작성하세요.)", "");
  }

  if (!i.organizeOnly && i.sections.length) {
    lines.push("[섹션 구성] (순서대로 작성)");
    i.sections.forEach((s, n) => {
      const instr = (s.instruction ?? "").trim();
      lines.push(`${n + 1}. ${s.title}${instr ? ` — ${instr}` : ""}`);
    });
    lines.push("");
  }

  lines.push("[출력 형식]");
  if (!i.organizeOnly && i.sections.length) {
    lines.push("아래 형태로 모든 섹션을 빠짐없이 마크다운으로 작성하세요. 섹션 제목 외의 머리말은 넣지 마세요.");
    i.sections.forEach((s) => lines.push(`## ${s.title}`, "(내용)", ""));
  } else {
    lines.push("마크다운 문서로 작성하세요. 적절한 ## 섹션으로 구성합니다.");
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

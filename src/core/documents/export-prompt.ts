/**
 * Pure formatter for the AI-free document path. Builds one clean, copy-pasteable
 * prompt that reproduces one-click document generation in an external AI
 * (ChatGPT/Claude/Gemini): role + Knowledge Base + ordered section plan + an
 * output shape that mirrors assembleDocumentMarkdown() (## per section) so the
 * pasted result drops straight into the manual composer or saves as .md.
 *
 * No LLM, no DB, no React — mirrors core/prompt-engine/export-prompt.ts in
 * intent. RAG grounding is intentionally omitted (not reproducible outside the
 * project); the KB carries the context instead.
 */

const LANG: Record<string, string> = { ko: "한국어", en: "English", ja: "日本語" };

export interface DocPromptSection {
  title: string;
  instruction: string;
}

export interface DocPromptKBEntry {
  label: string;
  value: string;
}

export function formatDocumentPrompt(i: {
  docName: string;
  system: string;
  sections: DocPromptSection[];
  /** Non-empty KB fields, already labelled. */
  kb: DocPromptKBEntry[];
  language?: string;
}): string {
  const lang = LANG[i.language ?? "ko"] ?? i.language ?? "한국어";
  const lines: string[] = [];

  lines.push("[역할]", (i.system ?? "").trim(), "");

  lines.push(
    "[작업]",
    `아래 Knowledge Base를 근거로 「${i.docName}」 문서를 작성하세요.`,
    "각 섹션을 순서대로, 지정된 제목을 마크다운 ## 머리말로 사용해 작성합니다.",
    "자료에 없는 수치·사실은 지어내지 말고 추정임을 명시하세요.",
    `출력 언어: ${lang}`,
    "",
  );

  if (i.kb.length) {
    lines.push("[Knowledge Base]");
    for (const e of i.kb) lines.push(`- ${e.label}: ${e.value}`);
    lines.push("");
  }

  if (i.sections.length) {
    lines.push("[섹션 구성] (순서대로 작성)");
    i.sections.forEach((s, n) => {
      const instr = (s.instruction ?? "").trim();
      lines.push(`${n + 1}. ${s.title}${instr ? ` — ${instr}` : ""}`);
    });
    lines.push("");
  }

  lines.push(
    "[출력 형식]",
    "아래 형태로, 모든 섹션을 빠짐없이 마크다운으로 작성하세요. 섹션 제목 외의 머리말이나 설명은 넣지 마세요.",
  );
  i.sections.forEach((s) => lines.push(`## ${s.title}`, "(내용)", ""));

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/* ── Multi-persona review (AI-free copy of the in-app reviewer) ──────────── */

export type ReviewPersonaKey = "investor" | "judge" | "customer" | "competitor";

// Mirrors the persona briefs in server/reviewer.ts. Kept here (not imported)
// because that module is server-only; this formatter must stay pure/client-safe.
const REVIEW_PERSONA: Record<ReviewPersonaKey, { label: string; brief: string }> = {
  investor: {
    label: "투자자",
    brief: "깐깐한 초기투자 심사역으로서 시장성·수익성·팀·리스크·투자 매력도를 냉정하게 본다",
  },
  judge: {
    label: "심사위원",
    brief: "정부지원사업·공모전 심사위원으로서 평가기준 부합도·명확성·실현 가능성을 본다",
  },
  customer: {
    label: "고객",
    brief: "타겟 고객으로서 가치 제안 공감도와 실제 지불 의사를 솔직하게 본다",
  },
  competitor: {
    label: "경쟁사",
    brief: "경쟁사 전략가로서 차별성의 취약점과 모방 가능성을 비판적으로 본다",
  },
};

const ALL_PERSONAS: ReviewPersonaKey[] = ["investor", "judge", "customer", "competitor"];

/**
 * Build a copy-pasteable prompt that reproduces the in-app multi-persona review
 * in an external AI: evaluate the target from each persona with a 0–10 score,
 * strengths, weaknesses, and suggestions.
 */
export function formatReviewPrompt(i: {
  docName: string;
  content: string;
  personas?: ReviewPersonaKey[];
}): string {
  const personas =
    i.personas && i.personas.length ? i.personas : ALL_PERSONAS;

  const lines: string[] = [];
  lines.push(
    "[역할]",
    "너는 서로 다른 전문가 관점을 가진 심사단이다. 각 관점에서 독립적으로, 한국어로 평가하라.",
    "",
    "[평가 관점]",
  );
  personas.forEach((p, n) => {
    const x = REVIEW_PERSONA[p];
    if (x) lines.push(`${n + 1}. ${x.label} — ${x.brief}`);
  });

  lines.push(
    "",
    "[작업]",
    `아래 「${i.docName}」 산출물을 위 각 관점에서 평가하라. 관점마다 다음을 제시한다:`,
    "- 점수: 0~10 (정수 또는 소수)",
    "- 강점: 2~3개",
    "- 약점: 2~3개",
    "- 개선 제안: 2~3개",
    "",
    "[산출물]",
    (i.content ?? "").trim(),
  );

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

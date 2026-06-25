/**
 * Pure formatter for the AI-free chat path. The in-app AI chat is multi-turn,
 * so there's no single prompt to reproduce it. Instead we hand the user a
 * compact "project context" block (Knowledge Base + verified analysis notes)
 * to paste once into an external chat (ChatGPT/Claude/Gemini); they then
 * converse there with the same grounding the in-app chat had. No LLM, no DB,
 * no React.
 */

export interface ContextKBEntry {
  label: string;
  value: string;
}

export interface ContextNote {
  title: string;
  body: string;
}

export function formatProjectContext(i: {
  kb: ContextKBEntry[];
  notes: ContextNote[];
}): string {
  const lines: string[] = [];

  lines.push(
    "[프로젝트 컨텍스트]",
    "아래는 내 창업 프로젝트의 정보입니다. 이 내용을 근거로 한국어로 간결하고 실용적으로 답해 주세요. 자료에 없는 수치·사실은 지어내지 말고 추정임을 밝혀 주세요.",
    "",
  );

  if (i.kb.length) {
    lines.push("[Knowledge Base]");
    for (const e of i.kb) lines.push(`- ${e.label}: ${e.value}`);
    lines.push("");
  }

  if (i.notes.length) {
    lines.push("[검증된 분석 자료]");
    i.notes.forEach((n, idx) => {
      lines.push(`${idx + 1}. ${(n.title ?? "").trim() || "분석 자료"}`);
      const body = (n.body ?? "").trim();
      if (body) lines.push(body);
      lines.push("");
    });
  }

  lines.push(
    "---",
    "위 컨텍스트를 모두 이해했다면 짧게 ‘준비됐다’고 답하고, 이후 제 질문에 답해 주세요.",
  );

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

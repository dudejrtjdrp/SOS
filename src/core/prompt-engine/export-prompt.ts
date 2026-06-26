import type { Variable } from "@/core/schemas/variables";
import type { OutputField, OutputFormat } from "@/core/schemas/output-format";

const SETTING_KEYS = ["tone", "length", "language"];
const LANG: Record<string, string> = { ko: "한국어", en: "English", ja: "日本語" };

function isEmpty(x: unknown): boolean {
  return (
    x == null ||
    (typeof x === "string" && x.trim() === "") ||
    (Array.isArray(x) && x.length === 0)
  );
}

function describeFields(fields: Record<string, OutputField>, depth: number): string[] {
  const pad = "  ".repeat(depth);
  const out: string[] = [];
  for (const [key, f] of Object.entries(fields)) {
    const name = f.label ?? key;
    const kind =
      f.type === "string[]"
        ? " (목록)"
        : f.type === "object[]"
          ? " (여러 항목)"
          : f.type === "number"
            ? " (숫자)"
            : "";
    out.push(`${pad}- ${name}${kind}`);
    if ((f.type === "object" || f.type === "object[]") && f.fields) {
      out.push(...describeFields(f.fields, depth + 1));
    }
  }
  return out;
}

/**
 * Build a clean, self-contained prompt a user can paste into an external AI
 * (ChatGPT/Claude) to reproduce a tool's result. Mirrors the engine's intent
 * (role + task + KB-merged inputs + desired output shape) in readable Korean,
 * minus the RAG context, which isn't reproducible outside the project.
 */
export function formatExternalPrompt(i: {
  system: string;
  instructions: string;
  variables: Variable[];
  inputs: Record<string, unknown>;
  kb: Record<string, string>;
  outputFormat?: unknown;
  /** When set, replaces the [출력 형식] body (used to force a tool's viz JSON shape). */
  outputOverride?: string;
  examples?: unknown;
}): string {
  const valueOf = (v: Variable): unknown => {
    const fromUser = i.inputs[v.key];
    const fromKB = v.source?.startsWith("kb:") ? i.kb[v.source.slice(3)] : undefined;
    return fromUser ?? fromKB ?? v.default ?? "";
  };

  const contentVars = i.variables.filter((v) => !SETTING_KEYS.includes(v.key));
  const settingVars = i.variables.filter((v) => SETTING_KEYS.includes(v.key));

  const lines: string[] = [];
  lines.push("[역할]", (i.system ?? "").trim(), "");
  lines.push("[작업]", (i.instructions ?? "").trim(), "");

  const inputLines = contentVars
    .map((v) => ({ v, value: valueOf(v) }))
    .filter((x) => !isEmpty(x.value))
    .map((x) => {
      const text = Array.isArray(x.value)
        ? (x.value as string[]).join(", ")
        : String(x.value);
      return `- ${x.v.label}: ${text}`;
    });
  if (inputLines.length) lines.push("[입력 정보]", ...inputLines, "");

  const setLines: string[] = [];
  for (const v of settingVars) {
    const raw = valueOf(v);
    if (isEmpty(raw)) continue;
    if (v.key === "language") setLines.push(`- 언어: ${LANG[String(raw)] ?? String(raw)}`);
    else if (v.key === "tone") setLines.push(`- 톤앤매너: ${String(raw)}`);
    else if (v.key === "length") setLines.push(`- 분량: ${String(raw)}/5 (1=간결, 5=상세)`);
  }
  if (setLines.length) lines.push("[작성 조건]", ...setLines, "");

  const of = i.outputFormat as OutputFormat | null | undefined;
  lines.push("[출력 형식]");
  if (i.outputOverride) {
    lines.push(i.outputOverride);
  } else if (of && typeof of === "object" && "fields" in of && of.fields) {
    lines.push("아래 항목을 모두 채워 구조화된 형태로 작성하세요:");
    lines.push(...describeFields(of.fields, 0));
  } else {
    lines.push("마크다운 형식의 서술형으로 작성하세요.");
  }

  const examples = (i.examples as { input?: string; output?: string }[] | undefined) ?? [];
  if (examples.length) {
    lines.push("", "[예시]");
    examples.forEach((e, n) => {
      lines.push(`예시 ${n + 1}`);
      if (e.input) lines.push(`입력: ${e.input}`);
      if (e.output) lines.push(`출력: ${e.output}`);
    });
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

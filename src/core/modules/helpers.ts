import type { Variable, OutputField, OutputFormat } from "@/core/schemas";
import type { SeedModule, DocSection } from "./types";

// ── Reusable variables ───────────────────────────────────────────
export const tone: Variable = {
  key: "tone",
  label: "톤앤매너",
  type: "select",
  options: ["전문적", "간결", "설득적", "친근함"],
  default: "전문적",
};
export const length: Variable = {
  key: "length",
  label: "출력 길이",
  type: "slider",
  min: 1,
  max: 5,
  default: 3,
};
export const language: Variable = {
  key: "language",
  label: "언어",
  type: "language",
  default: "ko",
};
export const common: Variable[] = [tone, length, language];

/** KB-backed variable (auto-filled from Knowledge Base). */
export function kb(
  key: string,
  label: string,
  type: Variable["type"] = "textarea",
  required = false,
): Variable {
  return { key, label, type, source: `kb:${key}`, required };
}

/** Per-input options for the richer builders below. */
export interface VarOpts {
  type?: Variable["type"];
  required?: boolean;
  /** Why this input is needed / what it derives (shown under the field). */
  desc?: string;
  placeholder?: string;
  options?: string[];
  /** Override the auto KB source (defaults to `kb:<key>` for `kbv`). */
  source?: string;
  default?: Variable["default"];
}

/** KB-backed variable with per-tool guidance. Auto-fills from `kb:<key>` unless
 *  `source` is overridden. Use for fields the project already carries. */
export function kbv(key: string, label: string, opts: VarOpts = {}): Variable {
  return {
    key,
    label,
    type: opts.type ?? "textarea",
    source: opts.source ?? `kb:${key}`,
    required: opts.required ?? false,
    description: opts.desc,
    placeholder: opts.placeholder,
    options: opts.options,
    default: opts.default,
  };
}

/** Manual (not KB-backed) input with per-tool guidance. Use for values specific
 *  to one framework — e.g. the items to prioritize, product lines, geography. */
export function inp(key: string, label: string, opts: VarOpts = {}): Variable {
  return {
    key,
    label,
    type: opts.type ?? "textarea",
    required: opts.required ?? false,
    description: opts.desc,
    placeholder: opts.placeholder,
    options: opts.options,
    default: opts.default,
  };
}

// ── Output field shorthands ──────────────────────────────────────
export const str = (label?: string, description?: string): OutputField => ({
  type: "string",
  label,
  description,
});
export const num = (label?: string): OutputField => ({ type: "number", label });
export const list = (label: string, min = 3): OutputField => ({
  type: "string[]",
  label,
  min,
});
export const obj = (
  label: string,
  fields: Record<string, OutputField>,
): OutputField => ({ type: "object", label, fields });
export const objs = (
  label: string,
  fields: Record<string, OutputField>,
  min = 1,
): OutputField => ({ type: "object[]", label, fields, min });
export const out = (fields: Record<string, OutputField>): OutputFormat => ({
  kind: "object",
  fields,
});

// ── Module builders ──────────────────────────────────────────────
interface Body {
  system: string;
  instructions: string;
  vars?: Variable[];
  output?: OutputFormat;
  examples?: SeedModule["examples"];
  task_class?: SeedModule["task_class"];
  icon?: string;
}

function build(
  category: SeedModule["category"],
  key: string,
  name: string,
  description: string,
  b: Body,
  defaultTask: SeedModule["task_class"],
): SeedModule {
  return {
    key,
    category,
    name,
    description,
    icon: b.icon,
    task_class: b.task_class ?? defaultTask,
    output_kind: b.output ? "structured" : "markdown",
    system_prompt: b.system,
    instructions: b.instructions,
    variables: b.vars ?? [...common],
    output_format: b.output,
    examples: b.examples,
  };
}

export const analysis = (k: string, n: string, d: string, b: Body) =>
  build("analysis", k, n, d, b, "drafting");
export const idea = (k: string, n: string, d: string, b: Body) =>
  build("idea", k, n, d, b, "drafting");
export const research = (k: string, n: string, d: string, b: Body) =>
  build("research", k, n, d, b, "drafting");
export const validation = (k: string, n: string, d: string, b: Body) =>
  build("validation", k, n, d, b, "drafting");

/** Document template (category "document"). */
export function doc(
  key: string,
  name: string,
  description: string,
  sections: DocSection[],
  preset?: string,
): SeedModule {
  return {
    key,
    category: "document",
    name,
    description,
    task_class: "reasoning",
    output_kind: "document",
    system_prompt:
      "너는 한국 창업 생태계(정부지원사업·TIPS·투자)를 잘 아는 전문 사업계획서 작성가다. 과장 없이 근거 기반으로, 심사자가 빠르게 핵심을 파악할 수 있게 구조적으로 작성한다.",
    instructions:
      "각 섹션을 Knowledge Base와 앞 섹션 내용을 참고해 일관되게 작성하라. 수치는 근거가 없으면 추정임을 명시한다.",
    variables: [language],
    doc_sections: sections,
    preset,
  };
}

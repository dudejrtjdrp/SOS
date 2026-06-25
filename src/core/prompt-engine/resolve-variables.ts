import type { Variable, KBFields } from "@/core/schemas";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Merge user inputs with Knowledge Base values (auto-injection) and defaults.
 * Precedence: explicit user input → KB (`source: "kb:<field>"`) → default.
 * Enforces required fields. This is what removes repeated input (docs/05 §3.2).
 */
export function resolveVariables(
  vars: Variable[],
  userInputs: Record<string, unknown>,
  kb: KBFields,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const v of vars) {
    const fromUser = userInputs[v.key];
    const fromKB = v.source?.startsWith("kb:")
      ? kb[v.source.slice(3)]
      : undefined;
    const value = fromUser ?? fromKB ?? v.default ?? null;

    const empty =
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0);
    if (v.required && empty) {
      throw new ValidationError(`필수 항목이 비어 있습니다: ${v.label}`);
    }
    out[v.key] = value;
  }
  return out;
}

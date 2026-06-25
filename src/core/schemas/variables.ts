import { z } from "zod";

export type VariableType =
  | "text"
  | "textarea"
  | "select"
  | "multiselect"
  | "slider"
  | "language";

export interface Variable {
  key: string;
  label: string;
  type: VariableType;
  /** "kb:<field>" → auto-filled from the Knowledge Base. */
  source?: string;
  options?: string[];
  min?: number;
  max?: number;
  default?: string | number | string[];
  required?: boolean;
  placeholder?: string;
  /** Per-tool guidance: why this input is needed / what it derives. Shown under
   *  the field in the run UI (takes precedence over the global FIELD_HELP). */
  description?: string;
}

/** Build a runtime Zod schema from a module's variable definitions, used to
 *  validate user input just before execution (docs/04 §7). */
export function buildInputZod(vars: Variable[]): z.ZodObject<z.ZodRawShape> {
  const shape: z.ZodRawShape = {};
  for (const v of vars) {
    let s: z.ZodTypeAny;
    switch (v.type) {
      case "multiselect":
        s = z.array(z.string());
        break;
      case "slider":
        s = z.number();
        break;
      default:
        s = z.string();
    }
    shape[v.key] = v.required ? s : s.optional();
  }
  return z.object(shape);
}

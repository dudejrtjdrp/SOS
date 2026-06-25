import { z } from "zod";

export type OutputFieldType =
  | "string"
  | "number"
  | "string[]"
  | "object"
  | "object[]"
  // Human-in-the-Loop (docs/08 §6): a fact/number the AI must tag with its
  // confidence + source so a human can verify it before it becomes KB truth.
  | "claim"
  | "claim[]";

export interface OutputField {
  type: OutputFieldType;
  label?: string;
  description?: string;
  /** minimum items for array types */
  min?: number;
  /** nested shape for "object" / "object[]" */
  fields?: Record<string, OutputField>;
}

export interface OutputFormat {
  kind: "object";
  fields: Record<string, OutputField>;
}

/** Convert a declarative output_format into a Zod schema so the engine can
 *  enforce structured output via streamObject/generateObject (docs/05 §3.4). */
export function buildOutputZod(format: OutputFormat): z.ZodTypeAny {
  return z.object(mapFields(format.fields));
}

function mapFields(fields: Record<string, OutputField>): z.ZodRawShape {
  const shape: z.ZodRawShape = {};
  for (const [key, f] of Object.entries(fields)) shape[key] = mapField(f);
  return shape;
}

function mapField(f: OutputField): z.ZodTypeAny {
  switch (f.type) {
    case "string": {
      const s = z.string();
      return f.description ? s.describe(f.description) : s;
    }
    case "number":
      return z.number();
    case "string[]": {
      const a = z.array(z.string());
      return f.min ? a.min(f.min) : a;
    }
    case "object":
      return z.object(mapFields(f.fields ?? {}));
    case "object[]": {
      const a = z.array(z.object(mapFields(f.fields ?? {})));
      return f.min ? a.min(f.min) : a;
    }
    case "claim":
      return claimSchema();
    case "claim[]": {
      const a = z.array(claimSchema());
      return f.min ? a.min(f.min) : a;
    }
  }
}

/** A verifiable claim: the AI declares confidence + source; a human later
 *  flips it to verified (stored alongside in the artifact content). */
function claimSchema(): z.ZodTypeAny {
  return z.object({
    value: z.string().describe("the claim or figure"),
    confidence: z
      .enum(["fact", "estimate"])
      .describe("'fact' only with a real source; otherwise 'estimate'"),
    source: z.string().optional().describe("source/citation when confidence is 'fact'"),
  });
}

import type { z } from "zod";

export interface ParsedExternal {
  /** "structured" when the pasted text parsed into the tool's schema; else "markdown". */
  kind: "structured" | "markdown";
  /** Object for structured (matches the tool schema); { markdown } otherwise. */
  content: unknown;
  /** Human-readable text stored as content_md and indexed for RAG. */
  contentMd: string;
}

/** Pull the most likely JSON object out of a pasted blob (handles ```json fences and surrounding prose). */
function extractJsonObject(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : text).trim();
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return body.slice(start, end + 1);
}

/**
 * Best-effort parse of a result a user ran in an external AI and pasted back.
 * For structured tools we try to recover JSON matching the tool's schema; if it
 * doesn't match (or there's no schema) we keep the raw text as markdown. This
 * never throws — a paste always yields a storable artifact. (manual fallback)
 */
export function parseExternalResult(
  text: string,
  opts: { structured: boolean; zod?: z.ZodTypeAny | null },
): ParsedExternal {
  const trimmed = text.trim();
  if (opts.structured && opts.zod) {
    const json = extractJsonObject(trimmed);
    if (json) {
      try {
        const obj = JSON.parse(json);
        const r = opts.zod.safeParse(obj);
        if (r.success) {
          return {
            kind: "structured",
            content: r.data,
            contentMd: JSON.stringify(r.data, null, 2),
          };
        }
      } catch {
        /* not valid JSON — fall through to markdown */
      }
    }
  }
  return { kind: "markdown", content: { markdown: trimmed }, contentMd: trimmed };
}

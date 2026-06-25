/**
 * Pure helpers for the manual document composer (docs/04 §4.2 — manual path).
 * Framework-agnostic so the server action, the client composer, and the live
 * preview all assemble identical markdown. No LLM, no DB.
 */

export interface ComposeBlock {
  id: string;
  title: string;
  body_md: string;
}

/** Assemble ordered blocks into one document body — mirrors generateDocument(). */
export function assembleDocumentMarkdown(
  blocks: { title: string; body_md: string }[],
): string {
  return blocks
    .map((b) => `## ${b.title.trim()}\n\n${b.body_md.trim()}`.trim())
    .join("\n\n");
}

/**
 * Turn an artifact's stored content into readable markdown to seed a block.
 * - markdown tools: content = { markdown }, so use that.
 * - structured tools: content is an object (content_md is raw JSON) → render it.
 * - otherwise fall back to whatever text we have.
 */
export function artifactToMarkdown(content: unknown, contentMd: string | null): string {
  if (content && typeof content === "object" && !Array.isArray(content)) {
    const obj = content as Record<string, unknown>;
    if (typeof obj.markdown === "string" && obj.markdown.trim()) {
      return obj.markdown.trim();
    }
    const md = structuredToMarkdown(obj);
    if (md.trim()) return md.trim();
  }
  return (contentMd ?? "").trim();
}

function humanize(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

function flat(v: unknown): string {
  if (v == null) return "";
  if (Array.isArray(v)) {
    return v.map((x) => (x && typeof x === "object" ? flat(x) : String(x))).join(", ");
  }
  if (typeof v === "object") {
    return Object.entries(v as Record<string, unknown>)
      .map(([k, val]) => `${humanize(k)}: ${flat(val)}`)
      .join("; ");
  }
  return String(v);
}

function renderValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    if (value.every((v) => v == null || typeof v === "string" || typeof v === "number")) {
      return value
        .filter((v) => v != null && String(v).trim() !== "")
        .map((v) => `- ${String(v)}`)
        .join("\n");
    }
    return value
      .map((v) =>
        v && typeof v === "object"
          ? Object.entries(v as Record<string, unknown>)
              .map(([k, val]) => `- **${humanize(k)}**: ${flat(val)}`)
              .join("\n")
          : `- ${String(v)}`,
      )
      .join("\n\n");
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, val]) => `- **${humanize(k)}**: ${flat(val)}`)
      .join("\n");
  }
  return "";
}

/** Render a flat-ish structured object as headed markdown sections. */
export function structuredToMarkdown(obj: Record<string, unknown>): string {
  const out: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith("__")) continue; // skip reserved keys (e.g. __viz layout)
    const rendered = renderValue(value);
    if (rendered) out.push(`### ${humanize(key)}\n\n${rendered}`);
  }
  return out.join("\n\n");
}

/** Pull a JSON object out of a pasted blob (handles ```json fences + prose). */
export function extractJson(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : text).trim();
  const s = body.indexOf("{");
  const e = body.lastIndexOf("}");
  if (s === -1 || e === -1 || e <= s) return null;
  try {
    const o = JSON.parse(body.slice(s, e + 1));
    return o && typeof o === "object" && !Array.isArray(o) ? (o as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Split a pasted blob into document prose (markdown) and the visualization JSON. */
export function splitDocAndJson(text: string): { json: Record<string, unknown> | null; doc: string } {
  const json = extractJson(text);
  let doc = text;
  const fence = text.match(/```(?:json)?\s*[\s\S]*?```/i);
  if (fence) {
    doc = text.replace(fence[0], "").trim();
  } else if (json) {
    const s = text.indexOf("{");
    const e = text.lastIndexOf("}");
    if (s !== -1 && e > s) doc = (text.slice(0, s) + text.slice(e + 1)).trim();
  }
  return { json, doc };
}

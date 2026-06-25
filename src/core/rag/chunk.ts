export interface Chunk {
  content: string;
  index: number;
}

/**
 * Approximate token-based chunking (512 tokens / 50 overlap, docs/05 §4.1)
 * using word windows (~1.33 tokens/word heuristic). Good enough for retrieval;
 * swap in a real tokenizer later if needed.
 */
export function chunkText(
  text: string,
  opts?: { size?: number; overlap?: number },
): Chunk[] {
  const size = opts?.size ?? 380; // ≈ 512 tokens
  const overlap = opts?.overlap ?? 40; // ≈ 50 tokens
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const chunks: Chunk[] = [];
  let start = 0;
  let index = 0;
  while (start < words.length) {
    chunks.push({ content: words.slice(start, start + size).join(" "), index: index++ });
    if (start + size >= words.length) break;
    start += size - overlap;
  }
  return chunks;
}

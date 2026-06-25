import type { SupabaseClient } from "@supabase/supabase-js";
import { embedText, toVectorLiteral } from "@/core/ai";
import type { RagSource } from "@/core/schemas";

const LABELS: Record<string, string> = {
  knowledge_entry: "KB",
  artifact: "이전 결과",
  document: "문서",
};

export interface RetrieveResult {
  chunks: { content: string; label: string }[];
  sources: RagSource[];
}

/**
 * Embed the query and pull the top-k most similar chunks for a project.
 * RLS on `embeddings` means callers only ever match their own rows
 * (RAG-with-permissions, docs/05 §4.3).
 */
export async function retrieve(
  supabase: SupabaseClient,
  projectId: string,
  query: string,
  k = 8,
): Promise<RetrieveResult> {
  if (!query.trim()) return { chunks: [], sources: [] };

  const q = await embedText(query);
  const { data, error } = await supabase.rpc("match_chunks", {
    p_project: projectId,
    p_query: toVectorLiteral(q),
    p_k: k,
  });
  if (error || !data) return { chunks: [], sources: [] };

  const rows = data as {
    source_type: RagSource["sourceType"];
    source_id: string;
    content: string;
    similarity: number;
  }[];

  return {
    chunks: rows.map((r) => ({ content: r.content, label: LABELS[r.source_type] ?? "자료" })),
    sources: rows.map((r) => ({
      sourceType: r.source_type,
      sourceId: r.source_id,
      label: LABELS[r.source_type] ?? "자료",
      similarity: r.similarity,
    })),
  };
}

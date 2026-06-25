import type { SupabaseClient } from "@supabase/supabase-js";
import { embedTexts, toVectorLiteral } from "@/core/ai";
import { chunkText } from "./chunk";

export interface IndexSourceParams {
  workspaceId: string;
  projectId: string;
  sourceType: "knowledge_entry" | "artifact" | "document";
  sourceId: string;
  text: string;
}

/**
 * (Re)index one source: chunk → embed → replace its rows in `embeddings`.
 * Idempotent per source (deletes stale chunks first). docs/05 §4.1.
 */
export async function indexSource(
  supabase: SupabaseClient,
  p: IndexSourceParams,
): Promise<number> {
  const chunks = chunkText(p.text ?? "");
  await supabase
    .from("embeddings")
    .delete()
    .eq("source_type", p.sourceType)
    .eq("source_id", p.sourceId);

  if (chunks.length === 0) return 0;

  const vectors = await embedTexts(chunks.map((c) => c.content));
  const rows = chunks.map((c, i) => ({
    workspace_id: p.workspaceId,
    project_id: p.projectId,
    source_type: p.sourceType,
    source_id: p.sourceId,
    chunk_index: c.index,
    content: c.content,
    embedding: toVectorLiteral(vectors[i]),
  }));

  const { error } = await supabase.from("embeddings").insert(rows);
  if (error) throw error;
  return rows.length;
}

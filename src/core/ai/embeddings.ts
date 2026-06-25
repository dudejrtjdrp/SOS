import { embed, embedMany } from "ai";
import { embeddingModel } from "./gateway";

// Gemini embedding model. gemini-embedding-001 supports configurable output
// dims; we request 1536 to match the embeddings.embedding halfvec(1536) column.
const EMBED_MODEL_ID = process.env.EMBEDDING_MODEL ?? "gemini-embedding-001";
const OUTPUT_DIMS = 1536;

const providerOptions = { google: { outputDimensionality: OUTPUT_DIMS } };

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const { embeddings } = await embedMany({
    model: embeddingModel(EMBED_MODEL_ID),
    values: texts,
    providerOptions,
  });
  return embeddings;
}

export async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: embeddingModel(EMBED_MODEL_ID),
    value: text,
    providerOptions,
  });
  return embedding;
}

/** pgvector / halfvec accepts the textual array literal form. */
export function toVectorLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}

import { google } from "@ai-sdk/google";

/**
 * Provider entry point — Google Gemini free tier (Google AI Studio).
 * Reads GOOGLE_GENERATIVE_AI_API_KEY from the environment. Call sites are
 * provider-agnostic, so switching providers is a one-line change here
 * (docs/05 §2.1).
 */
export function model(id: string) {
  return google(id);
}

/** Embedding model handle (gemini-embedding-001). Output dimensionality is
 *  set per call in embeddings.ts to match the embeddings.embedding halfvec(1536) column. */
export function embeddingModel(id: string) {
  return google.textEmbeddingModel(id);
}

import { z } from "zod";

export const RunInput = z.object({
  projectId: z.string().uuid(),
  moduleId: z.string().uuid(),
  inputs: z.record(z.unknown()),
  useRag: z.boolean().default(true),
});
export type RunInput = z.infer<typeof RunInput>;

export const DocumentGenerateInput = z.object({
  projectId: z.string().uuid(),
  docType: z.string().min(1),
  preset: z.string().optional(),
  language: z.string().default("ko"),
});
export type DocumentGenerateInput = z.infer<typeof DocumentGenerateInput>;

export const ReviewInput = z.object({
  targetType: z.enum(["artifact", "document"]),
  targetId: z.string().uuid(),
  personas: z
    .array(z.enum(["investor", "judge", "customer", "competitor"]))
    .default(["investor", "judge", "customer", "competitor"]),
});
export type ReviewInput = z.infer<typeof ReviewInput>;

/** A retrieval result that grounded a generation (provenance). */
export interface RagSource {
  sourceType: "knowledge_entry" | "artifact" | "document";
  sourceId: string;
  label: string;
  similarity: number;
}

/** A section inside a generated Document. */
export interface Section {
  id: string;
  title: string;
  artifactId?: string;
  body_md?: string;
}

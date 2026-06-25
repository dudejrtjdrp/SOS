import { streamText, streamObject, generateObject } from "ai";
import type { ModelMessage } from "ai";
import type { z } from "zod";
import { model } from "./gateway";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

// Extract the SDK's exact message param type to stay version-proof.
type StreamTextMessages = ModelMessage[];

interface BaseOpts {
  modelId: string;
  messages: ChatMessage[];
  temperature?: number;
}

/** Free-form markdown streaming (long document sections). */
export function runText(opts: BaseOpts) {
  return streamText({
    model: model(opts.modelId),
    messages: opts.messages as StreamTextMessages,
    temperature: opts.temperature,
  });
}

/** Structured streaming — enforces the module's output schema. */
export function runObject<T>(opts: BaseOpts & { schema: z.ZodType<T> }) {
  return streamObject({
    model: model(opts.modelId),
    schema: opts.schema,
    messages: opts.messages as StreamTextMessages,
    temperature: opts.temperature,
  });
}

/** Non-streaming structured generation (reviewer, variable extraction). */
export function genObject<T>(opts: BaseOpts & { schema: z.ZodType<T> }) {
  return generateObject({
    model: model(opts.modelId),
    schema: opts.schema,
    messages: opts.messages as StreamTextMessages,
    temperature: opts.temperature,
  });
}

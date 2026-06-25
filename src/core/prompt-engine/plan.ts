import type { z } from "zod";
import { selectModel, type ModelPolicy, type ChatMessage } from "@/core/ai";
import {
  buildOutputZod,
  type OutputFormat,
  type Variable,
  type KBFields,
} from "@/core/schemas";
import type { TaskClass } from "@/types/db";
import { resolveVariables } from "./resolve-variables";
import { renderMessages } from "./render-messages";

export interface PlanInput {
  taskClass: TaskClass;
  systemPrompt: string;
  instructions: string;
  variables: Variable[];
  outputFormat?: OutputFormat | null;
  examples?: { input?: string; output?: string }[];
  modelPolicy?: ModelPolicy | null;
  userInputs: Record<string, unknown>;
  kb: KBFields;
  ragChunks: { content: string; label: string }[];
}

export interface RunPlan {
  resolved: Record<string, unknown>;
  messages: ChatMessage[];
  modelId: string;
  temperature: number;
  outputZod?: z.ZodTypeAny;
}

/**
 * Pure planner: turns a loaded prompt version + KB + RAG into everything the
 * executor needs. Framework-agnostic and unit-testable. The DB-touching
 * orchestration (create run, stream, persist artifact) lives in the route
 * handler (docs/04 §4.1).
 */
export function buildRunPlan(i: PlanInput): RunPlan {
  const resolved = resolveVariables(i.variables, i.userInputs, i.kb);
  const messages = renderMessages({
    systemPrompt: i.systemPrompt,
    instructions: i.instructions,
    examples: i.examples,
    resolved,
    kb: i.kb,
    ragChunks: i.ragChunks,
  });
  const { modelId, temperature } = selectModel(i.taskClass, i.modelPolicy);
  const outputZod = i.outputFormat ? buildOutputZod(i.outputFormat) : undefined;
  return { resolved, messages, modelId, temperature, outputZod };
}

import type { TaskClass } from "@/types/db";

/**
 * Default model per task class — Google Gemini FREE tier (Flash family).
 * Pro models left the free tier in 2026, so every class maps to Flash /
 * Flash-Lite to stay $0. Swap these ids for paid models later if desired.
 */
export const MODEL_BY_TASK: Record<TaskClass, string> = {
  reasoning: "gemini-2.5-flash",
  drafting: "gemini-2.5-flash",
  light: "gemini-2.5-flash-lite",
};

/** Ordered fallback chains (all free-tier models). */
export const FALLBACK_CHAIN: Record<TaskClass, string[]> = {
  reasoning: ["gemini-2.5-flash", "gemini-2.5-flash-lite"],
  drafting: ["gemini-2.5-flash", "gemini-2.5-flash-lite"],
  light: ["gemini-2.5-flash-lite", "gemini-2.5-flash"],
};

export const DEFAULT_TEMPERATURE: Record<TaskClass, number> = {
  reasoning: 0.4,
  drafting: 0.7,
  light: 0.3,
};

export interface ModelPolicy {
  task_class?: TaskClass;
  model?: string;
  temperature?: number;
}

export function selectModel(taskClass: TaskClass, policy?: ModelPolicy | null) {
  const tc = policy?.task_class ?? taskClass;
  return {
    modelId: policy?.model ?? MODEL_BY_TASK[tc],
    temperature: policy?.temperature ?? DEFAULT_TEMPERATURE[tc],
    fallback: FALLBACK_CHAIN[tc],
  };
}

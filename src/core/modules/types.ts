import type { ModuleCategory, TaskClass, OutputKind } from "@/types/db";
import type { Variable, OutputFormat } from "@/core/schemas";

export interface Example {
  input?: string;
  output?: string;
}

/** A section of a generated Document (for category === "document"). */
export interface DocSection {
  key: string;
  title: string;
  /** Generation guidance for this section. */
  instruction: string;
  /** Optionally generate the section by running an existing analysis module. */
  module_key?: string;
}

/** Source-of-truth definition for a system module (seeded into the DB). */
export interface SeedModule {
  key: string;
  category: ModuleCategory;
  name: string;
  description: string;
  icon?: string;
  task_class: TaskClass;
  output_kind: OutputKind;
  system_prompt: string;
  instructions: string;
  variables: Variable[];
  output_format?: OutputFormat;
  examples?: Example[];
  doc_sections?: DocSection[];
  preset?: string;
}

/**
 * Hand-written row types mirroring supabase/migrations.
 * Can later be regenerated with: `supabase gen types typescript`.
 * Rich jsonb shapes (Variable, OutputFormat, KBFields, ...) are refined
 * in src/core/schemas; here they are typed as `Json` to stay faithful to DB.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ── Enums ─────────────────────────────────────────────────────────
export type Plan = "free" | "pro" | "team";
export type Role = "owner" | "member";
export type InviteStatus = "pending" | "accepted" | "revoked";
export type ProjectStatus = "active" | "archived";
export type ModuleCategory =
  | "idea"
  | "research"
  | "validation"
  | "analysis"
  | "document"
  | "custom";
export type TaskClass = "reasoning" | "drafting" | "light";
export type Visibility = "system" | "private" | "workspace";
export type OutputKind = "structured" | "markdown" | "document";
export type RunStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "canceled";
export type ArtifactKind =
  | "idea"
  | "research"
  | "validation"
  | "analysis"
  | "document_section";
export type VerificationStatus =
  | "ai_draft"
  | "needs_review"
  | "human_verified"
  | "rejected";
export type EmbeddingSource = "knowledge_entry" | "artifact" | "document";
export type ReviewPersona = "investor" | "judge" | "customer" | "competitor";
export type WorkflowRunStatus =
  | "running"
  | "succeeded"
  | "failed"
  | "canceled";

// ── Rows ──────────────────────────────────────────────────────────
export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  plan: Plan;
  token_budget_monthly: number;
  tokens_used_current: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: Role;
  created_at: string;
}

export interface WorkspaceInvite {
  id: string;
  workspace_id: string;
  email: string;
  role: Role;
  token: string;
  invited_by: string | null;
  status: InviteStatus;
  expires_at: string;
  created_at: string;
}

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeBase {
  id: string;
  project_id: string;
  workspace_id: string;
  fields: Json; // KBFields (see core/schemas)
  created_at: string;
  updated_at: string;
}

export interface KnowledgeEntry {
  id: string;
  knowledge_base_id: string;
  workspace_id: string;
  project_id: string;
  title: string | null;
  body: string | null;
  source_type: "note" | "upload" | "web" | "artifact";
  source_url: string | null;
  storage_path: string | null;
  embedding_status: "pending" | "done" | "failed";
  // Human-in-the-Loop (migration 0008): trust + provenance when promoted.
  verification_status: VerificationStatus;
  source_artifact_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Module {
  id: string;
  workspace_id: string | null;
  category: ModuleCategory;
  key: string | null;
  name: string;
  description: string | null;
  icon: string | null;
  task_class: TaskClass;
  visibility: Visibility;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PromptTemplate {
  id: string;
  module_id: string;
  workspace_id: string | null;
  current_version_id: string | null;
  output_kind: OutputKind;
  created_at: string;
}

export interface PromptVersion {
  id: string;
  prompt_template_id: string;
  workspace_id: string | null;
  version: number;
  system_prompt: string;
  instructions: string;
  variables: Json; // Variable[]
  output_format: Json; // OutputFormat
  examples: Json; // Example[]
  model_policy: Json | null;
  changelog: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Run {
  id: string;
  workspace_id: string;
  project_id: string;
  module_id: string;
  prompt_version_id: string | null;
  status: RunStatus;
  inputs: Json;
  resolved_messages: Json | null;
  rag_sources: Json; // RagSource[]
  provider: string | null;
  model: string | null;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  error: string | null;
  workflow_run_id: string | null;
  created_by: string | null;
  created_at: string;
  finished_at: string | null;
}

export interface Artifact {
  id: string;
  workspace_id: string;
  project_id: string;
  run_id: string | null;
  module_id: string | null;
  title: string | null;
  kind: ArtifactKind;
  content: Json;
  content_md: string | null;
  pinned: boolean;
  feedback: number | null;
  // Human-in-the-Loop (migration 0008): the human decision gate.
  verification_status: VerificationStatus;
  founder_take: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface DocumentRow {
  id: string;
  workspace_id: string;
  project_id: string;
  doc_type: string;
  preset: string | null;
  title: string;
  current_version_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  workspace_id: string | null;
  version: number;
  sections: Json; // Section[]
  body_md: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Workflow {
  id: string;
  workspace_id: string;
  project_id: string | null;
  name: string;
  description: string | null;
  is_preset: boolean;
  graph: Json; // WorkflowGraph
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowRun {
  id: string;
  workflow_id: string;
  workspace_id: string | null;
  project_id: string;
  status: WorkflowRunStatus;
  step_states: Json;
  created_by: string | null;
  created_at: string;
  finished_at: string | null;
}

export interface Embedding {
  id: string;
  workspace_id: string;
  project_id: string;
  source_type: EmbeddingSource;
  source_id: string;
  chunk_index: number;
  content: string;
  // embedding column is not selected into the client
  created_at: string;
}

export interface GraphEdge {
  id: string;
  workspace_id: string;
  project_id: string;
  from_type: string;
  from_id: string;
  to_type: string;
  to_id: string;
  relation: string;
  weight: number;
  created_at: string;
}

export interface Review {
  id: string;
  workspace_id: string;
  project_id: string | null;
  artifact_id: string | null;
  document_id: string | null;
  persona: ReviewPersona;
  score: number | null;
  strengths: Json;
  weaknesses: Json;
  suggestions: Json;
  run_id: string | null;
  created_at: string;
}

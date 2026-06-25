import "server-only";
import { createClient } from "@/lib/supabase/server";
import { artifactToMarkdown } from "@/core/documents/compose";
import type { VerificationStatus } from "@/types/db";

/** Normalize a Supabase nested relation that may come back as object or array. */
function one<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export async function getWorkspacesWithProjects() {
  const supabase = await createClient();
  const { data: members } = await supabase
    .from("workspace_members")
    .select("role, workspace:workspaces(id, name, plan)");

  const workspaces = (members ?? []).map((m) => {
    const w = one<{ id: string; name: string; plan: string }>(
      m.workspace as never,
    );
    return { id: w?.id ?? "", name: w?.name ?? "", plan: w?.plan ?? "free", role: m.role };
  });

  const ids = workspaces.map((w) => w.id).filter(Boolean);
  const { data: projects } = ids.length
    ? await supabase
        .from("projects")
        .select("id, name, description, workspace_id, updated_at")
        .in("workspace_id", ids)
        .eq("status", "active")
        .order("updated_at", { ascending: false })
    : { data: [] as Record<string, unknown>[] };

  return workspaces.map((w) => ({
    ...w,
    projects: (projects ?? []).filter((p) => p.workspace_id === w.id),
  }));
}

export async function getProject(projectId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("id, name, description, workspace_id, status")
    .eq("id", projectId)
    .maybeSingle();
  return data;
}

export async function getKnowledge(projectId: string) {
  const supabase = await createClient();
  const { data: kb } = await supabase
    .from("knowledge_bases")
    .select("id, fields")
    .eq("project_id", projectId)
    .maybeSingle();
  const { data: entries } = await supabase
    .from("knowledge_entries")
    .select("id, title, source_type, created_at, embedding_status")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  return { fields: (kb?.fields ?? {}) as Record<string, string>, entries: entries ?? [] };
}

export async function getModulesByCategory(category: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("modules")
    .select("id, key, name, description, task_class, visibility")
    .eq("category", category)
    .order("visibility", { ascending: false })
    .order("name");
  return data ?? [];
}

export async function getModuleForRun(moduleId: string) {
  const supabase = await createClient();
  const { data: mod } = await supabase
    .from("modules")
    .select("id, key, name, description, category")
    .eq("id", moduleId)
    .maybeSingle();
  if (!mod) return null;
  const { data: tpl } = await supabase
    .from("prompt_templates")
    .select("output_kind, current_version_id")
    .eq("module_id", moduleId)
    .maybeSingle();
  const { data: pv } = tpl?.current_version_id
    ? await supabase
        .from("prompt_versions")
        .select("variables")
        .eq("id", tpl.current_version_id)
        .maybeSingle()
    : { data: null };
  return {
    module: mod,
    outputKind: (tpl?.output_kind ?? "markdown") as string,
    variables: (pv?.variables ?? []) as unknown[],
  };
}

export async function getKBFields(projectId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("knowledge_bases")
    .select("fields")
    .eq("project_id", projectId)
    .maybeSingle();
  return (data?.fields ?? {}) as Record<string, string>;
}

export async function getArtifacts(projectId: string, limit = 50) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("artifacts")
    .select("id, title, kind, content, content_md, module_id, created_at, pinned, feedback")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getArtifact(artifactId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("artifacts")
    .select("id, title, kind, content, content_md, created_at, module_id")
    .eq("id", artifactId)
    .maybeSingle();
  return data;
}

export interface ComposeArtifact {
  id: string;
  label: string;
  kind: string;
  status: VerificationStatus;
  verified: boolean;
  createdAt: string;
  body: string;
}

const KIND_LABEL: Record<string, string> = {
  idea: "아이디어",
  research: "리서치",
  validation: "검증",
  analysis: "분석",
  document_section: "문서",
};

/** Non-rejected artifacts, shaped + pre-rendered to markdown for the manual composer. */
export async function getArtifactsForCompose(projectId: string): Promise<ComposeArtifact[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("artifacts")
    .select("id, kind, content, content_md, verification_status, created_at, module:modules(name)")
    .eq("project_id", projectId)
    .neq("verification_status", "rejected")
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []).map((a) => {
    const mod = one<{ name: string }>(a.module as never);
    return {
      id: a.id as string,
      label: mod?.name ?? KIND_LABEL[a.kind as string] ?? "결과",
      kind: a.kind as string,
      status: a.verification_status as VerificationStatus,
      verified: a.verification_status === "human_verified",
      createdAt: a.created_at as string,
      body: artifactToMarkdown(a.content, (a.content_md as string | null) ?? null),
    };
  });
}

export async function getDocuments(projectId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("documents")
    .select("id, title, doc_type, updated_at")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });
  return data ?? [];
}

export interface DocumentSection {
  id: string;
  title: string;
  body_md: string;
}

export async function getDocument(documentId: string) {
  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("documents")
    .select("id, title, doc_type, current_version_id, project_id")
    .eq("id", documentId)
    .maybeSingle();
  if (!doc) return null;
  const { data: ver } = await supabase
    .from("document_versions")
    .select("body_md, version, sections")
    .eq("id", doc.current_version_id)
    .maybeSingle();
  // Normalize sections so the inline editor can round-trip them; older rows may
  // carry partial shapes, so coerce each field with a safe fallback.
  const rawSections = Array.isArray(ver?.sections) ? (ver!.sections as unknown[]) : [];
  const sections: DocumentSection[] = rawSections.map((raw, i) => {
    const s = (raw ?? {}) as Record<string, unknown>;
    return {
      id: typeof s.id === "string" ? s.id : `sec-${i + 1}`,
      title: typeof s.title === "string" ? s.title : `섹션 ${i + 1}`,
      body_md: typeof s.body_md === "string" ? s.body_md : "",
    };
  });
  return {
    ...doc,
    body_md: ver?.body_md ?? "",
    version: ver?.version ?? 1,
    sections,
  };
}

export async function getDocumentTypes() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("modules")
    .select("key, name, description")
    .eq("category", "document")
    .order("name");
  return data ?? [];
}

export async function getProjectStats(projectId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("artifacts")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
  return { artifactCount: count ?? 0 };
}

// ── Library / Prompt Builder ──────────────────────────────────────
export async function getLibraryModules() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("modules")
    .select("id, key, name, description, category, visibility")
    .order("category")
    .order("name");
  return data ?? [];
}

export async function getModuleForEdit(moduleId: string) {
  const supabase = await createClient();
  const { data: mod } = await supabase
    .from("modules")
    .select("id, name, description, category, visibility")
    .eq("id", moduleId)
    .maybeSingle();
  if (!mod) return null;
  const { data: tpl } = await supabase
    .from("prompt_templates")
    .select("id, output_kind, current_version_id, workspace_id")
    .eq("module_id", moduleId)
    .maybeSingle();
  const { data: current } = tpl?.current_version_id
    ? await supabase
        .from("prompt_versions")
        .select("id, version, system_prompt, instructions, variables, output_format, examples")
        .eq("id", tpl.current_version_id)
        .maybeSingle()
    : { data: null };
  const { data: versions } = tpl?.id
    ? await supabase
        .from("prompt_versions")
        .select("id, version, changelog, created_at")
        .eq("prompt_template_id", tpl.id)
        .order("version", { ascending: false })
    : { data: [] };
  return {
    module: mod,
    templateId: tpl?.id as string | undefined,
    workspaceId: tpl?.workspace_id as string | null,
    outputKind: (tpl?.output_kind ?? "markdown") as string,
    current,
    versions: versions ?? [],
  };
}

export async function getModuleIdsByKeys(keys: string[]) {
  const supabase = await createClient();
  const { data } = await supabase.from("modules").select("id, key").in("key", keys);
  const map: Record<string, string> = {};
  (data ?? []).forEach((m) => {
    if (m.key) map[m.key] = m.id;
  });
  return map;
}

// ── Project Memory (Knowledge Graph) ──────────────────────────────
export async function getMemory(projectId: string) {
  const supabase = await createClient();
  const { data: artifacts } = await supabase
    .from("artifacts")
    .select("id, title, kind, module_id, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(100);
  const { data: edges } = await supabase
    .from("graph_edges")
    .select("from_id, to_id, to_type, relation")
    .eq("project_id", projectId);
  return { artifacts: artifacts ?? [], edges: edges ?? [] };
}

// ── Team ──────────────────────────────────────────────────────────
export async function getWorkspace(workspaceId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workspaces")
    .select("id, name, plan")
    .eq("id", workspaceId)
    .maybeSingle();
  return data;
}

export async function getTeam(workspaceId: string) {
  const supabase = await createClient();
  const { data: members } = await supabase
    .from("workspace_members")
    .select("user_id, role, created_at")
    .eq("workspace_id", workspaceId);
  const ids = (members ?? []).map((m) => m.user_id);
  const { data: profiles } = ids.length
    ? await supabase.from("profiles").select("id, display_name").in("id", ids)
    : { data: [] as { id: string; display_name: string | null }[] };
  const nameById: Record<string, string | null> = {};
  (profiles ?? []).forEach((p) => (nameById[p.id] = p.display_name));
  const { data: invites } = await supabase
    .from("workspace_invites")
    .select("id, email, role, status, created_at")
    .eq("workspace_id", workspaceId)
    .eq("status", "pending");
  return {
    members: (members ?? []).map((m) => ({
      userId: m.user_id,
      role: m.role,
      name: nameById[m.user_id] ?? null,
    })),
    invites: invites ?? [],
  };
}

// ── Chat context ──────────────────────────────────────────────────
export async function getKBForChat(projectId: string) {
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("workspace_id, name")
    .eq("id", projectId)
    .maybeSingle();
  const { data: kb } = await supabase
    .from("knowledge_bases")
    .select("fields")
    .eq("project_id", projectId)
    .maybeSingle();
  return {
    workspaceId: project?.workspace_id as string | undefined,
    name: project?.name as string | undefined,
    fields: (kb?.fields ?? {}) as Record<string, string>,
  };
}

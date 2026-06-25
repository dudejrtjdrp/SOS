-- ════════════════════════════════════════════════════════════════
-- 0007 · Row Level Security — default deny, membership-based allow
-- All helper funcs (is_member/is_owner) are SECURITY DEFINER so they
-- bypass RLS internally and avoid policy recursion.
-- ════════════════════════════════════════════════════════════════

-- Helper: do I share any workspace with `other`? (for profile visibility)
create or replace function public.shares_workspace(other uuid)
returns boolean
language sql stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members m1
    join public.workspace_members m2 on m1.workspace_id = m2.workspace_id
    where m1.user_id = auth.uid() and m2.user_id = other
  );
$$;

-- ── profiles ────────────────────────────────────────────────────
alter table public.profiles enable row level security;
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.shares_workspace(id));
create policy profiles_insert on public.profiles for insert
  with check (id = auth.uid());
create policy profiles_update on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- ── workspaces ──────────────────────────────────────────────────
alter table public.workspaces enable row level security;
create policy workspaces_select on public.workspaces for select
  using (public.is_member(id));
create policy workspaces_insert on public.workspaces for insert
  with check (created_by = auth.uid());
create policy workspaces_update on public.workspaces for update
  using (public.is_owner(id)) with check (public.is_owner(id));
create policy workspaces_delete on public.workspaces for delete
  using (public.is_owner(id));

-- ── workspace_members ───────────────────────────────────────────
alter table public.workspace_members enable row level security;
create policy members_select on public.workspace_members for select
  using (public.is_member(workspace_id));
create policy members_insert on public.workspace_members for insert
  with check (public.is_owner(workspace_id));
create policy members_update on public.workspace_members for update
  using (public.is_owner(workspace_id)) with check (public.is_owner(workspace_id));
create policy members_delete on public.workspace_members for delete
  using (public.is_owner(workspace_id) or user_id = auth.uid());

-- ── workspace_invites ───────────────────────────────────────────
alter table public.workspace_invites enable row level security;
create policy invites_select on public.workspace_invites for select
  using (public.is_member(workspace_id));
create policy invites_write on public.workspace_invites for all
  using (public.is_owner(workspace_id)) with check (public.is_owner(workspace_id));

-- ── Membership-scoped tables (select + all) ─────────────────────
-- projects
alter table public.projects enable row level security;
create policy projects_select on public.projects for select using (public.is_member(workspace_id));
create policy projects_write  on public.projects for all
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));

-- knowledge_bases
alter table public.knowledge_bases enable row level security;
create policy kb_select on public.knowledge_bases for select using (public.is_member(workspace_id));
create policy kb_write  on public.knowledge_bases for all
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));

-- knowledge_entries
alter table public.knowledge_entries enable row level security;
create policy entries_select on public.knowledge_entries for select using (public.is_member(workspace_id));
create policy entries_write  on public.knowledge_entries for all
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));

-- runs
alter table public.runs enable row level security;
create policy runs_select on public.runs for select using (public.is_member(workspace_id));
create policy runs_write  on public.runs for all
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));

-- artifacts
alter table public.artifacts enable row level security;
create policy artifacts_select on public.artifacts for select using (public.is_member(workspace_id));
create policy artifacts_write  on public.artifacts for all
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));

-- documents
alter table public.documents enable row level security;
create policy documents_select on public.documents for select using (public.is_member(workspace_id));
create policy documents_write  on public.documents for all
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));

-- document_versions
alter table public.document_versions enable row level security;
create policy docver_select on public.document_versions for select using (public.is_member(workspace_id));
create policy docver_write  on public.document_versions for all
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));

-- workflows
alter table public.workflows enable row level security;
create policy workflows_select on public.workflows for select using (public.is_member(workspace_id));
create policy workflows_write  on public.workflows for all
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));

-- workflow_runs
alter table public.workflow_runs enable row level security;
create policy wfruns_select on public.workflow_runs for select using (public.is_member(workspace_id));
create policy wfruns_write  on public.workflow_runs for all
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));

-- embeddings
alter table public.embeddings enable row level security;
create policy embeddings_select on public.embeddings for select using (public.is_member(workspace_id));
create policy embeddings_write  on public.embeddings for all
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));

-- graph_edges
alter table public.graph_edges enable row level security;
create policy edges_select on public.graph_edges for select using (public.is_member(workspace_id));
create policy edges_write  on public.graph_edges for all
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));

-- reviews
alter table public.reviews enable row level security;
create policy reviews_select on public.reviews for select using (public.is_member(workspace_id));
create policy reviews_write  on public.reviews for all
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));

-- ── Modules & prompts: system rows (workspace_id NULL) are world-readable ──
alter table public.modules enable row level security;
create policy modules_select on public.modules for select
  using (workspace_id is null or public.is_member(workspace_id));
create policy modules_write on public.modules for all
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));

alter table public.prompt_templates enable row level security;
create policy ptpl_select on public.prompt_templates for select
  using (workspace_id is null or public.is_member(workspace_id));
create policy ptpl_write on public.prompt_templates for all
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));

alter table public.prompt_versions enable row level security;
create policy pver_select on public.prompt_versions for select
  using (workspace_id is null or public.is_member(workspace_id));
create policy pver_write on public.prompt_versions for all
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));

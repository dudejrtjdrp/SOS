-- ════════════════════════════════════════════════════════════════
-- SOS · Combined schema (migrations 0001–0008)
-- Paste into Supabase Dashboard → SQL Editor → Run.
-- Then:  npm run seed
-- ════════════════════════════════════════════════════════════════


-- ╔══════════════════════════════════════════════════════════════
-- ║ FILE: migrations/0001_extensions_helpers.sql
-- ╚══════════════════════════════════════════════════════════════
-- ════════════════════════════════════════════════════════════════
-- 0001 · Extensions & generic helpers
-- ════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";   -- gen_random_uuid / gen_random_bytes
create extension if not exists "vector";      -- pgvector (RAG, halfvec)

-- Generic updated_at trigger function (attached per-table below).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ╔══════════════════════════════════════════════════════════════
-- ║ FILE: migrations/0002_identity_workspaces.sql
-- ╚══════════════════════════════════════════════════════════════
-- ════════════════════════════════════════════════════════════════
-- 0002 · Identity, workspaces, team (members + invites)
-- ════════════════════════════════════════════════════════════════

-- ── Profiles (mirror of auth.users for display) ─────────────────
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row whenever a new auth user signs up, and
-- auto-join any workspaces this email was invited to (see 0010).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  -- 이 이메일로 와 있던 대기 초대 → 멤버십으로 (가입 즉시 합류).
  insert into public.workspace_members (workspace_id, user_id, role)
    select i.workspace_id, new.id, i.role
    from public.workspace_invites i
    where lower(i.email) = lower(new.email)
      and i.status = 'pending'
  on conflict (workspace_id, user_id) do nothing;

  update public.workspace_invites
    set status = 'accepted'
    where lower(email) = lower(new.email)
      and status = 'pending';

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Workspaces ──────────────────────────────────────────────────
create table public.workspaces (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  plan                 text not null default 'free' check (plan in ('free','pro','team')),
  token_budget_monthly bigint not null default 2000000,   -- cost guardrail
  tokens_used_current  bigint not null default 0,
  created_by           uuid references auth.users(id),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create trigger trg_workspaces_updated before update on public.workspaces
  for each row execute function public.set_updated_at();

-- ── Members ─────────────────────────────────────────────────────
create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null default 'member' check (role in ('owner','member')),
  created_at   timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index idx_members_user on public.workspace_members(user_id);

-- ── Invites (team feature) ──────────────────────────────────────
create table public.workspace_invites (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email        text not null,
  role         text not null default 'member' check (role in ('owner','member')),
  token        text not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by   uuid references auth.users(id),
  status       text not null default 'pending' check (status in ('pending','accepted','revoked')),
  expires_at   timestamptz not null default (now() + interval '14 days'),
  created_at   timestamptz not null default now()
);
create index idx_invites_workspace on public.workspace_invites(workspace_id);
create index idx_invites_email on public.workspace_invites(email);

-- ── Membership helpers (security definer → avoids RLS recursion) ─
create or replace function public.is_member(ws uuid)
returns boolean
language sql stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_owner(ws uuid)
returns boolean
language sql stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = auth.uid() and m.role = 'owner'
  );
$$;

-- ── Atomic workspace creation (creator becomes owner) ───────────
-- Avoids the RLS chicken-and-egg of inserting the first member.
create or replace function public.create_workspace(p_name text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare ws_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  insert into public.workspaces (name, created_by)
    values (p_name, auth.uid())
    returning id into ws_id;
  insert into public.workspace_members (workspace_id, user_id, role)
    values (ws_id, auth.uid(), 'owner');
  return ws_id;
end;
$$;

-- ── Accept an invite by token ───────────────────────────────────
create or replace function public.accept_invite(p_token text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare inv public.workspace_invites;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  select * into inv from public.workspace_invites
    where token = p_token and status = 'pending' and expires_at > now();
  if inv.id is null then
    raise exception 'invalid or expired invite';
  end if;
  insert into public.workspace_members (workspace_id, user_id, role)
    values (inv.workspace_id, auth.uid(), inv.role)
    on conflict (workspace_id, user_id) do nothing;
  update public.workspace_invites set status = 'accepted' where id = inv.id;
  return inv.workspace_id;
end;
$$;

-- ── Add a member by email (instant, no link — see 0010) ─────────
create or replace function public.add_member_by_email(
  p_workspace_id uuid,
  p_email        text,
  p_role         text default 'member'
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_role  text := coalesce(nullif(trim(p_role), ''), 'member');
  v_uid   uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.is_owner(p_workspace_id) then
    raise exception 'forbidden: only owners can add members';
  end if;
  if v_email is null or v_email = '' then
    raise exception 'email required';
  end if;
  if v_role not in ('owner', 'member') then
    v_role := 'member';
  end if;

  select id into v_uid from auth.users where lower(email) = v_email limit 1;

  if v_uid is not null then
    insert into public.workspace_members (workspace_id, user_id, role)
      values (p_workspace_id, v_uid, v_role)
      on conflict (workspace_id, user_id) do nothing;
    update public.workspace_invites
      set status = 'accepted'
      where workspace_id = p_workspace_id
        and lower(email) = v_email
        and status = 'pending';
    return jsonb_build_object('status', 'added');
  end if;

  update public.workspace_invites
    set role = v_role
    where workspace_id = p_workspace_id
      and lower(email) = v_email
      and status = 'pending';
  if not found then
    insert into public.workspace_invites (workspace_id, email, role, invited_by)
      values (p_workspace_id, v_email, v_role, auth.uid());
  end if;
  return jsonb_build_object('status', 'invited');
end;
$$;


-- ╔══════════════════════════════════════════════════════════════
-- ║ FILE: migrations/0003_projects_knowledge.sql
-- ╚══════════════════════════════════════════════════════════════
-- ════════════════════════════════════════════════════════════════
-- 0003 · Projects & Knowledge Base
-- ════════════════════════════════════════════════════════════════

create table public.projects (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name         text not null,
  description  text,
  status       text not null default 'active' check (status in ('active','archived')),
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index idx_projects_workspace on public.projects(workspace_id);

create trigger trg_projects_updated before update on public.projects
  for each row execute function public.set_updated_at();

-- One Knowledge Base per project (single source of truth).
create table public.knowledge_bases (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null unique references public.projects(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  -- Structured fields: market/target/problem/solution/competitors/
  -- business_model/tech_stack/revenue_model/usp/service_description ...
  fields       jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger trg_kb_updated before update on public.knowledge_bases
  for each row execute function public.set_updated_at();

-- Free-form knowledge (notes / uploads / web clips) — RAG source.
create table public.knowledge_entries (
  id                uuid primary key default gen_random_uuid(),
  knowledge_base_id uuid not null references public.knowledge_bases(id) on delete cascade,
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  project_id        uuid not null references public.projects(id) on delete cascade,
  title             text,
  body              text,
  source_type       text not null default 'note'
                      check (source_type in ('note','upload','web','artifact')),
  source_url        text,
  storage_path      text,
  embedding_status  text not null default 'pending'
                      check (embedding_status in ('pending','done','failed')),
  created_by        uuid references auth.users(id),
  created_at        timestamptz not null default now()
);
create index idx_entries_kb on public.knowledge_entries(knowledge_base_id);
create index idx_entries_project on public.knowledge_entries(project_id);
create index idx_entries_embed_status on public.knowledge_entries(embedding_status)
  where embedding_status = 'pending';


-- ╔══════════════════════════════════════════════════════════════
-- ║ FILE: migrations/0004_modules_runs.sql
-- ╚══════════════════════════════════════════════════════════════
-- ════════════════════════════════════════════════════════════════
-- 0004 · Modules, Prompt Templates/Versions, Runs, Artifacts
-- ════════════════════════════════════════════════════════════════

-- Module = reusable prompt-based tool (SWOT, TAM-SAM-SOM, ...).
-- workspace_id NULL → system-provided (readable by everyone).
create table public.modules (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  category     text not null check (category in
                 ('idea','research','validation','analysis','document','custom')),
  key          text,                      -- 'swot','tam_sam_som' (system modules)
  name         text not null,
  description  text,
  icon         text,
  task_class   text not null default 'drafting'
                 check (task_class in ('reasoning','drafting','light')),
  visibility   text not null default 'private'
                 check (visibility in ('system','private','workspace')),
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index idx_modules_system_key on public.modules(key) where visibility = 'system';
create index idx_modules_workspace on public.modules(workspace_id, category);

create trigger trg_modules_updated before update on public.modules
  for each row execute function public.set_updated_at();

-- Template header; body lives in prompt_versions (append-only).
create table public.prompt_templates (
  id                 uuid primary key default gen_random_uuid(),
  module_id          uuid not null references public.modules(id) on delete cascade,
  workspace_id       uuid references public.workspaces(id) on delete cascade,
  current_version_id uuid,                -- → prompt_versions.id (no hard FK: circular)
  output_kind        text not null default 'structured'
                       check (output_kind in ('structured','markdown','document')),
  created_at         timestamptz not null default now()
);
create index idx_ptpl_module on public.prompt_templates(module_id);

create table public.prompt_versions (
  id                 uuid primary key default gen_random_uuid(),
  prompt_template_id uuid not null references public.prompt_templates(id) on delete cascade,
  workspace_id       uuid references public.workspaces(id) on delete cascade,
  version            int not null,
  system_prompt      text not null,
  instructions       text not null,
  variables          jsonb not null default '[]'::jsonb,   -- input schema
  output_format      jsonb not null default '{}'::jsonb,   -- structured output schema
  examples           jsonb not null default '[]'::jsonb,   -- few-shot
  model_policy       jsonb,                                -- {task_class, model, temperature}
  changelog          text,
  created_by         uuid references auth.users(id),
  created_at         timestamptz not null default now(),
  unique (prompt_template_id, version)
);

-- Run = one execution of a module.
create table public.runs (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  project_id        uuid not null references public.projects(id) on delete cascade,
  module_id         uuid not null references public.modules(id),
  prompt_version_id uuid references public.prompt_versions(id),
  status            text not null default 'queued'
                      check (status in ('queued','running','succeeded','failed','canceled')),
  inputs            jsonb not null default '{}'::jsonb,
  resolved_messages jsonb,                  -- audit / reproducibility
  rag_sources       jsonb not null default '[]'::jsonb,   -- provenance
  provider          text,
  model             text,
  tokens_in         int not null default 0,
  tokens_out        int not null default 0,
  cost_usd          numeric(10,5) not null default 0,
  error             text,
  workflow_run_id   uuid,
  created_by        uuid references auth.users(id),
  created_at        timestamptz not null default now(),
  finished_at       timestamptz
);
create index idx_runs_project on public.runs(project_id, created_at desc);
create index idx_runs_workspace on public.runs(workspace_id, created_at desc);

-- Artifact = structured result of a run.
create table public.artifacts (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id   uuid not null references public.projects(id) on delete cascade,
  run_id       uuid references public.runs(id) on delete set null,
  module_id    uuid references public.modules(id),
  title        text,
  kind         text not null default 'analysis'
                 check (kind in ('idea','research','validation','analysis','document_section')),
  content      jsonb not null,            -- conforms to output_format
  content_md   text,                      -- rendered markdown cache
  pinned       boolean not null default false,
  feedback     smallint,                  -- 👍 1 / 👎 -1
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now()
);
create index idx_artifacts_project on public.artifacts(project_id, kind, created_at desc);

-- Accumulate workspace token usage when a run succeeds (cost guardrail).
create or replace function public.bump_usage()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'succeeded' and (old.status is distinct from 'succeeded') then
    update public.workspaces
      set tokens_used_current = tokens_used_current + new.tokens_in + new.tokens_out
      where id = new.workspace_id;
  end if;
  return new;
end;
$$;

create trigger trg_bump_usage after update on public.runs
  for each row execute function public.bump_usage();


-- ╔══════════════════════════════════════════════════════════════
-- ║ FILE: migrations/0005_documents_workflows.sql
-- ╚══════════════════════════════════════════════════════════════
-- ════════════════════════════════════════════════════════════════
-- 0005 · Documents (+ versions) and Workflows
-- ════════════════════════════════════════════════════════════════

create table public.documents (
  id                 uuid primary key default gen_random_uuid(),
  workspace_id       uuid not null references public.workspaces(id) on delete cascade,
  project_id         uuid not null references public.projects(id) on delete cascade,
  doc_type           text not null,        -- 'biz_plan','ir_deck','one_pager','tips',...
  preset             text,                 -- 'government','investment','hackathon',...
  title              text not null,
  current_version_id uuid,                 -- → document_versions.id (no hard FK: circular)
  created_by         uuid references auth.users(id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index idx_documents_project on public.documents(project_id, created_at desc);

create trigger trg_documents_updated before update on public.documents
  for each row execute function public.set_updated_at();

create table public.document_versions (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references public.documents(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  version      int not null,
  -- sections: [{ id, title, artifact_id?, body_md? }]
  sections     jsonb not null default '[]'::jsonb,
  body_md      text,                       -- assembled full markdown (export source)
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now(),
  unique (document_id, version)
);

-- Workflow = DAG of module nodes wired by input_map.
create table public.workflows (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id   uuid references public.projects(id) on delete cascade,
  name         text not null,
  description  text,
  is_preset    boolean not null default false,
  graph        jsonb not null default '{"nodes":[],"edges":[]}'::jsonb,
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger trg_workflows_updated before update on public.workflows
  for each row execute function public.set_updated_at();

create table public.workflow_runs (
  id           uuid primary key default gen_random_uuid(),
  workflow_id  uuid not null references public.workflows(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  project_id   uuid not null references public.projects(id) on delete cascade,
  status       text not null default 'running'
                 check (status in ('running','succeeded','failed','canceled')),
  step_states  jsonb not null default '{}'::jsonb,   -- { nodeId: { status, run_id } }
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now(),
  finished_at  timestamptz
);
create index idx_wfruns_workflow on public.workflow_runs(workflow_id, created_at desc);


-- ╔══════════════════════════════════════════════════════════════
-- ║ FILE: migrations/0006_rag_reviews.sql
-- ╚══════════════════════════════════════════════════════════════
-- ════════════════════════════════════════════════════════════════
-- 0006 · RAG (embeddings), Knowledge Graph, Reviews
-- ════════════════════════════════════════════════════════════════

-- Unified embeddings table (polymorphic source). halfvec(1536) — 2026 best practice.
create table public.embeddings (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id   uuid not null references public.projects(id) on delete cascade,
  source_type  text not null check (source_type in ('knowledge_entry','artifact','document')),
  source_id    uuid not null,
  chunk_index  int not null default 0,
  content      text not null,             -- chunk text (512 tokens / 50 overlap)
  embedding    halfvec(1536) not null,
  created_at   timestamptz not null default now()
);
-- HNSW + cosine: p99 < 10ms up to ~5M vectors.
create index idx_embeddings_hnsw on public.embeddings
  using hnsw (embedding halfvec_cosine_ops);
create index idx_embeddings_source on public.embeddings(project_id, source_type, source_id);

-- Knowledge Graph: provenance / context edges between entities.
create table public.graph_edges (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id   uuid not null references public.projects(id) on delete cascade,
  from_type    text not null,             -- run / artifact / document / knowledge_entry / kb
  from_id      uuid not null,
  to_type      text not null,
  to_id        uuid not null,
  relation     text not null,             -- derived_from / cites / part_of / reviews
  weight       real not null default 1.0,
  created_at   timestamptz not null default now()
);
create index idx_edges_from on public.graph_edges(project_id, from_id);
create index idx_edges_to on public.graph_edges(project_id, to_id);

-- AI Reviewer output (multi-persona evaluation).
create table public.reviews (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id   uuid references public.projects(id) on delete cascade,
  artifact_id  uuid references public.artifacts(id) on delete cascade,
  document_id  uuid references public.documents(id) on delete cascade,
  persona      text not null check (persona in ('investor','judge','customer','competitor')),
  score        numeric(4,2),              -- 0..10
  strengths    jsonb not null default '[]'::jsonb,
  weaknesses   jsonb not null default '[]'::jsonb,
  suggestions  jsonb not null default '[]'::jsonb,
  run_id       uuid references public.runs(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index idx_reviews_artifact on public.reviews(artifact_id);
create index idx_reviews_document on public.reviews(document_id);

-- ── RAG retrieval RPC (RLS-aware: caller only sees their rows) ───
create or replace function public.match_chunks(
  p_project uuid,
  p_query   halfvec(1536),
  p_k       int default 8
)
returns table (
  source_type text,
  source_id   uuid,
  content     text,
  similarity  float
)
language sql stable
as $$
  select e.source_type, e.source_id, e.content,
         1 - (e.embedding <=> p_query) as similarity
  from public.embeddings e
  where e.project_id = p_project
  order by e.embedding <=> p_query
  limit p_k;
$$;


-- ╔══════════════════════════════════════════════════════════════
-- ║ FILE: migrations/0007_rls_policies.sql
-- ╚══════════════════════════════════════════════════════════════
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


-- ╔══════════════════════════════════════════════════════════════
-- ║ FILE: migrations/0008_human_in_the_loop.sql
-- ╚══════════════════════════════════════════════════════════════
-- ════════════════════════════════════════════════════════════════
-- 0008 · Human-in-the-Loop — Decision Gate, Founder's Take, Verification
-- Design principle #7 "Human Decides" (docs/08). Additive only; new
-- columns inherit existing RLS policies (0007).
-- ════════════════════════════════════════════════════════════════

alter table public.artifacts
  add column if not exists verification_status text not null default 'ai_draft'
    check (verification_status in ('ai_draft','needs_review','human_verified','rejected')),
  add column if not exists founder_take text,
  add column if not exists verified_by  uuid references auth.users(id),
  add column if not exists verified_at  timestamptz;

create index if not exists idx_artifacts_needs_review
  on public.artifacts(project_id, created_at desc)
  where verification_status = 'needs_review';

alter table public.knowledge_entries
  add column if not exists verification_status text not null default 'human_verified'
    check (verification_status in ('ai_draft','needs_review','human_verified','rejected')),
  add column if not exists source_artifact_id uuid references public.artifacts(id) on delete set null;

create index if not exists idx_entries_source_artifact
  on public.knowledge_entries(source_artifact_id)
  where source_artifact_id is not null;


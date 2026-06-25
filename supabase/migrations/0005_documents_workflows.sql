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

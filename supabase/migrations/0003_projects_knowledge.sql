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

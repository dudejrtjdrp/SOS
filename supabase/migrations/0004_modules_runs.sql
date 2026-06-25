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

-- ════════════════════════════════════════════════════════════════
-- 0011 · 행사 정보 (project-level event brief)
--
-- A single, project-scoped brief describing the call/event a team is
-- aiming at — 행사명(event name), 행사 주제(topic), and 비고(remarks).
-- This is NOT per-공고문; there is exactly one row per project (the
-- unique project_id), edited from the 공고문 page and used to seed the
-- Idea Lab "출품·참가 아이디어" tool.
--
-- Membership-scoped RLS mirrors 0007/0009; additive only — safe to run
-- on an existing database.
-- ════════════════════════════════════════════════════════════════

create table if not exists public.project_events (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id   uuid not null unique references public.projects(id) on delete cascade,
  event_name   text not null default '',   -- 행사명
  event_topic  text not null default '',   -- 행사 주제
  note         text not null default '',   -- 비고 (요건·심사 기준·제약 등)
  updated_by   uuid references auth.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_project_events_project on public.project_events(project_id);

drop trigger if exists trg_project_events_updated on public.project_events;
create trigger trg_project_events_updated before update on public.project_events
  for each row execute function public.set_updated_at();

-- ── RLS (membership-scoped, mirrors 0007/0009) ───────────────────
alter table public.project_events enable row level security;
drop policy if exists project_events_select on public.project_events;
create policy project_events_select on public.project_events for select
  using (public.is_member(workspace_id));
drop policy if exists project_events_write on public.project_events;
create policy project_events_write on public.project_events for all
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));

-- FULL replica identity so Realtime delete events ship project_id for filtering.
alter table public.project_events replica identity full;

-- ── Realtime publication (idempotent) ────────────────────────────
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'project_events'
  ) then
    execute 'alter publication supabase_realtime add table public.project_events';
  end if;
end $$;

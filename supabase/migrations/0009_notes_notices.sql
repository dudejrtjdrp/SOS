-- ════════════════════════════════════════════════════════════════
-- 0009 · 문서함(Notes) & 공고문(Notices) + Realtime
--
-- Notion-style free-form notes (meeting minutes, idea notes, …) and a
-- project announcement/공고 shelf (files, images, links) with a deadline
-- and submission status. Both follow the membership-scoped RLS pattern
-- from 0007 (select = is_member, write = is_member for all).
--
-- Also enables Supabase Realtime for the collaborative surfaces so an
-- explicit save on one client shows up live on a teammate's screen.
-- Additive only — safe to run on an existing database.
-- ════════════════════════════════════════════════════════════════

-- ── 문서함 (free-form, template-typed notes) ─────────────────────
create table if not exists public.notes (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id   uuid not null references public.projects(id) on delete cascade,
  -- 'meeting' | 'idea' | 'research' | 'interview' | 'decision' | 'retro' | 'free'
  note_type    text not null default 'free',
  title        text not null default '',
  -- Template field values, keyed by the template's field key (see core/notes).
  fields       jsonb not null default '{}'::jsonb,
  body_md      text,
  tags         text[] not null default '{}',
  pinned       boolean not null default false,
  created_by   uuid references auth.users(id),
  updated_by   uuid references auth.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_notes_project on public.notes(project_id, updated_at desc);
create index if not exists idx_notes_type on public.notes(project_id, note_type);

drop trigger if exists trg_notes_updated on public.notes;
create trigger trg_notes_updated before update on public.notes
  for each row execute function public.set_updated_at();

-- ── 공고문 (announcement / call-for-proposal shelf) ──────────────
create table if not exists public.notices (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id   uuid not null references public.projects(id) on delete cascade,
  title        text not null,
  kind         text not null default 'link' check (kind in ('file','image','link')),
  url          text,                 -- for kind='link'
  storage_key  text,                 -- R2 object key for kind in ('file','image')
  file_name    text,
  mime_type    text,
  size_bytes   bigint,
  description  text,
  deadline     date,                 -- 마감일 (D-day)
  status       text not null default 'open'
                 check (status in ('open','preparing','submitted','closed')),
  tags         text[] not null default '{}',
  pinned       boolean not null default false,
  created_by   uuid references auth.users(id),
  updated_by   uuid references auth.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_notices_project on public.notices(project_id, created_at desc);
create index if not exists idx_notices_deadline on public.notices(project_id, deadline)
  where deadline is not null;

drop trigger if exists trg_notices_updated on public.notices;
create trigger trg_notices_updated before update on public.notices
  for each row execute function public.set_updated_at();

-- ── RLS (membership-scoped, mirrors 0007) ────────────────────────
alter table public.notes enable row level security;
drop policy if exists notes_select on public.notes;
create policy notes_select on public.notes for select using (public.is_member(workspace_id));
drop policy if exists notes_write on public.notes;
create policy notes_write on public.notes for all
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));

alter table public.notices enable row level security;
drop policy if exists notices_select on public.notices;
create policy notices_select on public.notices for select using (public.is_member(workspace_id));
drop policy if exists notices_write on public.notices;
create policy notices_write on public.notices for all
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));

-- DELETE on these only ships the replica-identity columns to Realtime; FULL
-- lets clients filter deletes by project_id like inserts/updates.
alter table public.notes replica identity full;
alter table public.notices replica identity full;

-- ── Realtime publication (idempotent) ────────────────────────────
-- Subscribers receive postgres_changes for these tables, still gated by the
-- RLS policies above. Guard every step so re-running the migration is safe.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'notes', 'notices', 'knowledge_bases', 'documents', 'document_versions'
  ]
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

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

-- Auto-create a profile row whenever a new auth user signs up.
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

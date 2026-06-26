-- ════════════════════════════════════════════════════════════════
-- 0010 · Instant member add (no invite link)
--
-- 기존: 초대 → 토큰 → 링크 공유 → 상대가 /join?token 으로 수락.
-- 변경: 오너가 이메일만 입력하면
--   • 이미 가입된 사용자  → 그 자리에서 workspace_members 에 추가(즉시 멤버)
--   • 아직 미가입 이메일  → pending 초대로 보관했다가, 그 이메일로 가입하는
--                           순간 트리거가 자동으로 워크스페이스에 합류시킴.
-- 어느 쪽이든 "링크를 열어 수락" 단계가 사라진다.
-- ════════════════════════════════════════════════════════════════

-- ── 이메일로 멤버 즉시 추가 ──────────────────────────────────────
-- security definer 로 auth.users 를 조회한다(일반 RLS 로는 못 봄).
-- 호출자가 해당 워크스페이스의 owner 인지 먼저 확인한다.
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

  -- 이미 가입된 사용자인가?
  select id into v_uid from auth.users where lower(email) = v_email limit 1;

  if v_uid is not null then
    -- 즉시 멤버로 추가. 이미 멤버면 조용히 통과.
    insert into public.workspace_members (workspace_id, user_id, role)
      values (p_workspace_id, v_uid, v_role)
      on conflict (workspace_id, user_id) do nothing;
    -- 같은 이메일로 남아 있던 대기 초대는 정리.
    update public.workspace_invites
      set status = 'accepted'
      where workspace_id = p_workspace_id
        and lower(email) = v_email
        and status = 'pending';
    return jsonb_build_object('status', 'added');
  end if;

  -- 미가입자 → 대기 초대 보관(가입 시 트리거가 자동 합류시킴).
  -- 동일 (워크스페이스, 이메일) 대기 초대가 있으면 역할만 갱신.
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

-- ── 가입 시 대기 초대 자동 합류 ──────────────────────────────────
-- 프로필 생성에 더해, 이 이메일 앞으로 와 있던 pending 초대를
-- 전부 멤버십으로 전환한다. → 가입하는 순간 워크스페이스에 들어와 있음.
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

  -- 이 이메일로 와 있던 대기 초대 → 멤버십으로.
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

-- 트리거 자체는 0002 에서 이미 만들어졌고 함수 본문만 교체되므로 재생성 불필요.

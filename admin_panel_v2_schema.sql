-- Admin panel, part two: siyumim, who is actually learning, growth,
-- chaburos support, moderation, and a message banner for everyone.
--
-- One script, safe to re-run. Every function checks the caller's is_admin
-- flag first (admin_assert) — nothing here loosens RLS for anyone else.
-- Private perek notes and concept notes are never read by anything here.

-- ============================================================
-- 0. The one admin check every function below starts with
-- ============================================================
create or replace function admin_assert()
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin) then
    raise exception 'not authorized';
  end if;
end; $$;

-- Completions from one user_data blob, tolerating a missing or non-array
-- value (older accounts, or a reset in progress).
create or replace function admin_completions(p_data jsonb)
returns jsonb
language sql immutable as $$
  select case when jsonb_typeof(p_data->'completions') = 'array' then p_data->'completions' else '[]'::jsonb end;
$$;

-- ============================================================
-- 1. Schema additions
-- ============================================================

-- When someone joined a chabura. Nullable with no backfill: existing
-- memberships have no real join date, and inventing one would be wrong.
alter table group_members add column if not exists created_at timestamptz;
alter table group_members alter column created_at set default now();

-- An archived chabura is hidden from its members' lists but kept intact.
alter table groups add column if not exists archived_at timestamptz;

-- One message shown at the top of the app for everyone (a chag message,
-- an outage notice). A single row, readable by anyone only while active.
create table if not exists app_announcement (
  id int primary key default 1 check (id = 1),
  message text not null default '',
  active boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
insert into app_announcement (id) values (1) on conflict (id) do nothing;
alter table app_announcement enable row level security;
drop policy if exists "everyone reads the active announcement" on app_announcement;
create policy "everyone reads the active announcement" on app_announcement
  for select using (active);
grant select on app_announcement to anon, authenticated;

-- ============================================================
-- 2. Users
-- ============================================================

-- The list, now with last sign-in, email confirmation, last day learned
-- and Daily Limmud position. Return shape changed, so it is dropped first.
drop function if exists admin_list_users();
create function admin_list_users()
returns table (
  id uuid,
  email text,
  username text,
  first_name text,
  last_name text,
  city text,
  country text,
  is_admin boolean,
  created_at timestamptz,
  mishnayot_learned bigint,
  signed_up_via text,
  last_sign_in_at timestamptz,
  email_confirmed_at timestamptz,
  last_learned_date text,
  daily_limmud_position int
)
language plpgsql security definer set search_path = public as $$
begin
  perform admin_assert();
  return query select
    u.id,
    u.email::text,
    p.username,
    p.first_name,
    p.last_name,
    p.city,
    p.country,
    coalesce(p.is_admin, false),
    u.created_at,
    jsonb_array_length(admin_completions(ud.data))::bigint,
    coalesce(u.raw_app_meta_data->>'provider', 'email'),
    u.last_sign_in_at,
    u.email_confirmed_at,
    (select max(c->>'date') from jsonb_array_elements(admin_completions(ud.data)) c),
    case when jsonb_typeof(ud.data->'dailyLimmudPosition') = 'number'
      then floor((ud.data->>'dailyLimmudPosition')::numeric)::int end
  from auth.users u
  left join profiles p on p.id = u.id
  left join user_data ud on ud.user_id = u.id
  order by u.created_at desc;
end; $$;
grant execute on function admin_list_users() to authenticated;

-- Everything the user drawer shows beyond the list row: learning by day
-- (for the streak and the chart), by masechet, pace, chaburos, siyum
-- perakim taken on, and siyumim they started.
create or replace function admin_user_detail(p_user_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_email text;
  v_data jsonb;
  v_comp jsonb;
  v_result jsonb;
begin
  perform admin_assert();
  select u.email into v_email from auth.users u where u.id = p_user_id;
  select ud.data into v_data from user_data ud where ud.user_id = p_user_id;
  v_data := coalesce(v_data, '{}'::jsonb);
  v_comp := admin_completions(v_data);

  select jsonb_build_object(
    'days', coalesce((
      select jsonb_agg(jsonb_build_object('date', d.day, 'count', d.n) order by d.day)
      from (select c->>'date' as day, count(*) as n from jsonb_array_elements(v_comp) c group by 1) d
    ), '[]'::jsonb),
    'masechtot', coalesce((
      select jsonb_agg(jsonb_build_object('masechetEn', m.masechet, 'count', m.n) order by m.n desc, m.masechet)
      from (select c->>'masechetEn' as masechet, count(*) as n from jsonb_array_elements(v_comp) c group by 1) m
    ), '[]'::jsonb),
    'frozenDates', case when jsonb_typeof(v_data->'frozenDates') = 'array' then v_data->'frozenDates' else '[]'::jsonb end,
    'dailyLimmudPace', v_data->'dailyLimmudPace',
    'groups', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', g.id, 'name', g.name, 'masechetEn', g.masechet_en, 'isChabura', g.is_chabura,
        'isClass', g.is_class, 'role', gm.role, 'joinedAt', gm.created_at, 'archived', g.archived_at is not null
      ) order by g.masechet_en)
      from group_members gm join groups g on g.id = gm.group_id
      where gm.user_id = p_user_id
    ), '[]'::jsonb),
    'claims', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', np.id, 'siyumId', s.id, 'dedication', s.dedication, 'masechetEn', np.masechet_en,
        'perek', np.perek, 'learned', np.learned, 'claimedAt', np.claimed_at, 'learnedAt', np.learned_at
      ) order by np.claimed_at desc)
      from nishmat_perakim np join nishmat_siyumim s on s.id = np.siyum_id
      where np.claimed_by_user_id = p_user_id
         or (v_email is not null and lower(np.claimed_by_email) = lower(v_email))
    ), '[]'::jsonb),
    'siyumim', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'dedication', s.dedication, 'createdAt', s.created_at) order by s.created_at desc)
      from nishmat_siyumim s where s.owner_id = p_user_id
    ), '[]'::jsonb)
  ) into v_result;
  return v_result;
end; $$;
grant execute on function admin_user_detail(uuid) to authenticated;

-- Make someone admin, or remove it. An admin can't remove their own
-- access, so the panel can never lock out the person using it.
create or replace function admin_set_admin(p_user_id uuid, p_is_admin boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform admin_assert();
  if p_user_id = auth.uid() and not p_is_admin then
    raise exception 'You can''t remove your own admin access.';
  end if;
  insert into profiles (id, username, is_admin)
  values (p_user_id, 'user_' || p_user_id::text, p_is_admin)
  on conflict (id) do update set is_admin = excluded.is_admin;
end; $$;
grant execute on function admin_set_admin(uuid, boolean) to authenticated;

-- Fix a username or name that shouldn't be shown to others.
create or replace function admin_update_profile_name(p_user_id uuid, p_username text, p_first_name text, p_last_name text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform admin_assert();
  if coalesce(trim(p_username), '') = '' then
    raise exception 'A username is required.';
  end if;
  if exists (select 1 from profiles p where lower(p.username) = lower(trim(p_username)) and p.id <> p_user_id) then
    raise exception 'That username is already taken.';
  end if;
  update profiles
  set username = trim(p_username),
      first_name = nullif(trim(coalesce(p_first_name, '')), ''),
      last_name = nullif(trim(coalesce(p_last_name, '')), '')
  where id = p_user_id;
end; $$;
grant execute on function admin_update_profile_name(uuid, text, text, text) to authenticated;

-- ============================================================
-- 3. Growth
-- ============================================================
create or replace function admin_growth()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_today text := to_char(now(), 'YYYY-MM-DD');
  v_week text := to_char(now() - interval '6 days', 'YYYY-MM-DD');
  v_prev_start text := to_char(now() - interval '13 days', 'YYYY-MM-DD');
  v_month text := to_char(now() - interval '29 days', 'YYYY-MM-DD');
  v_result jsonb;
begin
  perform admin_assert();

  with comp as (
    select ud.user_id, c->>'date' as day, c->>'masechetEn' as masechet
    from user_data ud, jsonb_array_elements(admin_completions(ud.data)) c
  )
  select jsonb_build_object(
    'usersTotal', (select count(*) from auth.users),
    'googleTotal', (select count(*) from auth.users u where u.raw_app_meta_data->>'provider' = 'google'),
    'signupsByWeek', coalesce((
      select jsonb_agg(jsonb_build_object('week', w.week, 'google', w.google, 'email', w.email) order by w.week)
      from (
        select to_char(date_trunc('week', u.created_at), 'YYYY-MM-DD') as week,
          count(*) filter (where u.raw_app_meta_data->>'provider' = 'google') as google,
          count(*) filter (where coalesce(u.raw_app_meta_data->>'provider', 'email') <> 'google') as email
        from auth.users u
        where u.created_at >= date_trunc('week', now()) - interval '25 weeks'
        group by 1
      ) w
    ), '[]'::jsonb),
    'activeByDay', coalesce((
      select jsonb_agg(jsonb_build_object('date', a.day, 'users', a.users, 'mishnayot', a.n) order by a.day)
      from (select comp.day, count(distinct comp.user_id) as users, count(*) as n from comp where comp.day >= v_month group by comp.day) a
    ), '[]'::jsonb),
    'activeToday', (select count(distinct comp.user_id) from comp where comp.day = v_today),
    'activeWeek', (select count(distinct comp.user_id) from comp where comp.day >= v_week),
    'activeMonth', (select count(distinct comp.user_id) from comp where comp.day >= v_month),
    'mishnayotWeek', (select count(*) from comp where comp.day >= v_week),
    'mishnayotPrevWeek', (select count(*) from comp where comp.day >= v_prev_start and comp.day < v_week),
    'mishnayotTotal', (select count(*) from comp),
    'topMasechtot', coalesce((
      select jsonb_agg(jsonb_build_object('masechetEn', t.masechet, 'mishnayot', t.n, 'learners', t.learners) order by t.n desc, t.masechet)
      from (
        select comp.masechet, count(*) as n, count(distinct comp.user_id) as learners
        from comp where comp.masechet is not null
        group by comp.masechet order by count(*) desc limit 10
      ) t
    ), '[]'::jsonb),
    'gamePlays', (
      select jsonb_build_object(
        'quiz', coalesce(sum(case when jsonb_typeof(ud.data #> '{gameStats,quiz,timesPlayed}') = 'number' then (ud.data #>> '{gameStats,quiz,timesPlayed}')::numeric end), 0),
        'dash', coalesce(sum(case when jsonb_typeof(ud.data #> '{gameStats,dash,timesPlayed}') = 'number' then (ud.data #>> '{gameStats,dash,timesPlayed}')::numeric end), 0),
        'chazara', coalesce(sum(case when jsonb_typeof(ud.data #> '{gameStats,chazara,timesPlayed}') = 'number' then (ud.data #>> '{gameStats,chazara,timesPlayed}')::numeric end), 0),
        'sort', coalesce(sum(case when jsonb_typeof(ud.data #> '{gameStats,sort,timesCompleted}') = 'number' then (ud.data #>> '{gameStats,sort,timesCompleted}')::numeric end), 0),
        'sidrei', coalesce(sum(case when jsonb_typeof(ud.data #> '{gameStats,sidrei,timesCompleted}') = 'number' then (ud.data #>> '{gameStats,sidrei,timesCompleted}')::numeric end), 0)
      )
      from user_data ud
    )
  ) into v_result;
  return v_result;
end; $$;
grant execute on function admin_growth() to authenticated;

-- ============================================================
-- 4. Siyumim
-- ============================================================
create or replace function admin_list_siyumim()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_result jsonb;
begin
  perform admin_assert();
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', s.id,
    'dedication', s.dedication,
    'occasion', s.occasion,
    'targetDate', s.target_date,
    'visibility', s.visibility,
    'shareSlug', s.share_slug,
    'createdAt', s.created_at,
    'ownerId', s.owner_id,
    'ownerEmail', u.email,
    'ownerName', nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ''),
    'learned', (select count(*) from nishmat_perakim np where np.siyum_id = s.id and np.learned),
    'taken', (select count(*) from nishmat_perakim np where np.siyum_id = s.id and not np.learned),
    'stale', (select count(*) from nishmat_perakim np where np.siyum_id = s.id and not np.learned and np.claimed_at < now() - interval '30 days')
  ) order by s.created_at desc), '[]'::jsonb)
  into v_result
  from nishmat_siyumim s
  left join auth.users u on u.id = s.owner_id
  left join profiles p on p.id = s.owner_id;
  return v_result;
end; $$;
grant execute on function admin_list_siyumim() to authenticated;

create or replace function admin_siyum_claims(p_siyum_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_result jsonb;
begin
  perform admin_assert();
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', np.id,
    'masechetEn', np.masechet_en,
    'perek', np.perek,
    'name', np.claimed_by_name,
    'email', coalesce(np.claimed_by_email, u.email),
    'userId', np.claimed_by_user_id,
    'anonymous', np.anonymous,
    'learned', np.learned,
    'claimedAt', np.claimed_at,
    'learnedAt', np.learned_at
  ) order by np.learned, np.claimed_at), '[]'::jsonb)
  into v_result
  from nishmat_perakim np
  left join auth.users u on u.id = np.claimed_by_user_id
  where np.siyum_id = p_siyum_id;
  return v_result;
end; $$;
grant execute on function admin_siyum_claims(uuid) to authenticated;

create or replace function admin_update_siyum(p_siyum_id uuid, p_dedication text, p_occasion text, p_visibility text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform admin_assert();
  if coalesce(trim(p_dedication), '') = '' then
    raise exception 'A dedication is required.';
  end if;
  if p_visibility not in ('public', 'private') then
    raise exception 'unknown visibility: %', p_visibility;
  end if;
  update nishmat_siyumim
  set dedication = trim(p_dedication),
      occasion = nullif(trim(coalesce(p_occasion, '')), ''),
      visibility = p_visibility
  where id = p_siyum_id;
end; $$;
grant execute on function admin_update_siyum(uuid, text, text, text) to authenticated;

-- Removes a siyum and every perek taken on for it.
create or replace function admin_delete_siyum(p_siyum_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform admin_assert();
  delete from nishmat_perakim where siyum_id = p_siyum_id;
  delete from nishmat_siyumim where id = p_siyum_id;
end; $$;
grant execute on function admin_delete_siyum(uuid) to authenticated;

-- Frees a perek someone took on and never learned — back to open. A
-- learned perek is never released.
create or replace function admin_release_claim(p_claim_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform admin_assert();
  delete from nishmat_perakim where id = p_claim_id and not learned;
end; $$;
grant execute on function admin_release_claim(uuid) to authenticated;

-- ============================================================
-- 5. Chaburos
-- ============================================================

-- The list, now with join code, pending invites, last submission and
-- archived state. Returns jsonb (whole group row plus counts) so a new
-- column on groups shows up without another shape change.
drop function if exists admin_list_groups();
create function admin_list_groups()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_result jsonb;
begin
  perform admin_assert();
  select coalesce(jsonb_agg(to_jsonb(g) || jsonb_build_object(
    'member_count', (select count(*) from group_members m where m.group_id = g.id),
    'teacher_email', (
      select u.email from group_members m join auth.users u on u.id = m.user_id
      where m.group_id = g.id and m.role = 'teacher' limit 1
    ),
    'pending_invites', (
      select count(*) from group_invites i
      where i.group_id = g.id and coalesce(i.status, 'pending') = 'pending'
    ),
    'last_submission', (select max(gs.submission_date) from group_submissions gs where gs.group_id = g.id)
  ) order by g.created_at desc), '[]'::jsonb)
  into v_result
  from groups g;
  return v_result;
end; $$;
grant execute on function admin_list_groups() to authenticated;

-- The roster, now with real join dates for anyone who joins from here on.
create or replace function admin_group_members(p_group_id uuid)
returns table (
  user_id uuid,
  email text,
  first_name text,
  last_name text,
  role text,
  joined_at timestamptz
)
language sql security definer set search_path = public as $$
  select
    m.user_id,
    u.email,
    p.first_name,
    p.last_name,
    m.role,
    m.created_at
  from group_members m
  join auth.users u on u.id = m.user_id
  left join profiles p on p.id = m.user_id
  where m.group_id = p_group_id
    and exists (select 1 from profiles where id = auth.uid() and is_admin)
  order by (m.role = 'teacher') desc, u.email;
$$;
grant execute on function admin_group_members(uuid) to authenticated;

-- Invites (pending and answered) and the last 60 days of daily
-- submissions for one chabura.
create or replace function admin_group_detail(p_group_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_result jsonb;
begin
  perform admin_assert();
  select jsonb_build_object(
    'invites', coalesce((
      select jsonb_agg(to_jsonb(i) order by i.invited_email)
      from group_invites i where i.group_id = p_group_id
    ), '[]'::jsonb),
    'submissions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'userId', gs.user_id, 'email', u.email, 'firstName', p.first_name, 'username', p.username,
        'date', gs.submission_date, 'sentAt', gs.sent_at, 'payload', gs.payload
      ) order by gs.submission_date desc, u.email)
      from group_submissions gs
      left join auth.users u on u.id = gs.user_id
      left join profiles p on p.id = gs.user_id
      where gs.group_id = p_group_id and gs.submission_date >= current_date - 60
    ), '[]'::jsonb)
  ) into v_result;
  return v_result;
end; $$;
grant execute on function admin_group_detail(uuid) to authenticated;

create or replace function admin_update_group(p_group_id uuid, p_name text, p_masechet_en text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform admin_assert();
  if coalesce(trim(p_masechet_en), '') = '' then
    raise exception 'A masechet is required.';
  end if;
  update groups
  set name = nullif(trim(coalesce(p_name, '')), ''),
      masechet_en = trim(p_masechet_en)
  where id = p_group_id;
end; $$;
grant execute on function admin_update_group(uuid, text, text) to authenticated;

create or replace function admin_set_group_archived(p_group_id uuid, p_archived boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform admin_assert();
  update groups set archived_at = case when p_archived then now() end where id = p_group_id;
end; $$;
grant execute on function admin_set_group_archived(uuid, boolean) to authenticated;

-- Moves the rebbe role to another member of the same chabura. The old
-- rebbe stays in the chabura as a talmid.
create or replace function admin_transfer_rebbe(p_group_id uuid, p_user_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform admin_assert();
  if not exists (select 1 from group_members m where m.group_id = p_group_id and m.user_id = p_user_id) then
    raise exception 'That person isn''t in this chabura.';
  end if;
  update group_members set role = 'member'
  where group_id = p_group_id and role = 'teacher' and user_id <> p_user_id;
  update group_members set role = 'teacher'
  where group_id = p_group_id and user_id = p_user_id;
end; $$;
grant execute on function admin_transfer_rebbe(uuid, uuid) to authenticated;

create or replace function admin_delete_invite(p_invite_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform admin_assert();
  delete from group_invites where id = p_invite_id;
end; $$;
grant execute on function admin_delete_invite(uuid) to authenticated;

-- ============================================================
-- 6. Moderation — text other people can see
-- ============================================================
create or replace function admin_recent_content(p_limit int default 100)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_limit int := greatest(1, least(coalesce(p_limit, 100), 500));
  v_result jsonb;
begin
  perform admin_assert();
  select jsonb_build_object(
    'notes', coalesce((
      select jsonb_agg(x.item order by x.ts desc) from (
        select n.created_at as ts, jsonb_build_object(
          'id', n.id, 'body', n.body, 'createdAt', n.created_at, 'editedAt', n.edited_at,
          'authorId', n.author_id, 'authorEmail', u.email,
          'authorName', nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ''),
          'groupId', g.id, 'groupName', coalesce(g.name, g.masechet_en),
          'masechetEn', n.masechet_en, 'perek', n.perek, 'mishnah', n.mishnah
        ) as item
        from group_notes n
        join groups g on g.id = n.group_id
        left join auth.users u on u.id = n.author_id
        left join profiles p on p.id = n.author_id
        order by n.created_at desc limit v_limit
      ) x
    ), '[]'::jsonb),
    'comments', coalesce((
      select jsonb_agg(x.item order by x.ts desc) from (
        select c.created_at as ts, jsonb_build_object(
          'id', c.id, 'body', c.body, 'createdAt', c.created_at,
          'authorId', c.author_id, 'authorEmail', u.email,
          'authorName', nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ''),
          'groupId', g.id, 'groupName', coalesce(g.name, g.masechet_en),
          'masechetEn', n.masechet_en, 'perek', n.perek, 'mishnah', n.mishnah
        ) as item
        from group_note_comments c
        join group_notes n on n.id = c.note_id
        join groups g on g.id = n.group_id
        left join auth.users u on u.id = c.author_id
        left join profiles p on p.id = c.author_id
        order by c.created_at desc limit v_limit
      ) x
    ), '[]'::jsonb),
    'names', coalesce((
      select jsonb_agg(x.item order by x.ts desc) from (
        select u.created_at as ts, jsonb_build_object(
          'userId', u.id, 'email', u.email, 'username', p.username,
          'firstName', p.first_name, 'lastName', p.last_name, 'createdAt', u.created_at
        ) as item
        from auth.users u
        join profiles p on p.id = u.id
        order by u.created_at desc limit v_limit
      ) x
    ), '[]'::jsonb)
  ) into v_result;
  return v_result;
end; $$;
grant execute on function admin_recent_content(int) to authenticated;

create or replace function admin_delete_group_note(p_note_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform admin_assert();
  delete from group_note_comments where note_id = p_note_id;
  delete from group_notes where id = p_note_id;
end; $$;
grant execute on function admin_delete_group_note(uuid) to authenticated;

create or replace function admin_delete_note_comment(p_comment_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform admin_assert();
  delete from group_note_comments where id = p_comment_id;
end; $$;
grant execute on function admin_delete_note_comment(uuid) to authenticated;

-- ============================================================
-- 7. The announcement
-- ============================================================
create or replace function admin_get_announcement()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_result jsonb;
begin
  perform admin_assert();
  select jsonb_build_object('message', a.message, 'active', a.active, 'updatedAt', a.updated_at)
  into v_result
  from app_announcement a where a.id = 1;
  return v_result;
end; $$;
grant execute on function admin_get_announcement() to authenticated;

-- An empty message can't be switched on.
create or replace function admin_set_announcement(p_message text, p_active boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform admin_assert();
  insert into app_announcement (id) values (1) on conflict (id) do nothing;
  update app_announcement
  set message = coalesce(trim(p_message), ''),
      active = coalesce(p_active, false) and coalesce(trim(p_message), '') <> '',
      updated_at = now(),
      updated_by = auth.uid()
  where id = 1;
end; $$;
grant execute on function admin_set_announcement(text, boolean) to authenticated;

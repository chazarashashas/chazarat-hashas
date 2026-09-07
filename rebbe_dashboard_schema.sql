-- Rebbe dashboard schema
-- Adds: a join code per chabura (faster than emailing eighteen invites),
-- and a daily submission table — one row per student per group per local
-- date, storing the day's figures as a snapshot (never a live link back
-- to the student's own progress, so a later change on their end can't
-- silently rewrite what the rebbe already received).
--
-- Consent model unchanged from group_invites: a rebbe invites by email or
-- shares a join code, the student's own action (accepting, or entering
-- the code) is what creates the group_members row. Nothing of a
-- student's becomes visible to a rebbe before that row exists.

-- 1. Join code: nullable, unique, only meaningful for a chabura.
alter table groups add column if not exists join_code text unique;

-- Six-character codes (uppercase letters + digits, ambiguous characters
-- like O/0 and I/1 excluded) — short enough to read aloud in a shiur.
create or replace function generate_join_code()
returns text
language plpgsql as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    end loop;
    exit when not exists (select 1 from groups where join_code = code);
  end loop;
  return code;
end; $$;

-- Generates (or rotates) this chabura's join code. Only the creator or a
-- teacher member may call it — same authorization shape as
-- updateGroupMasechet, which the app already trusts client-side calls to
-- gate on role, so this checks it server-side too.
create or replace function rotate_join_code(p_group_id uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare
  new_code text;
begin
  if not exists (
    select 1 from group_members
    where group_id = p_group_id and user_id = auth.uid() and role = 'teacher'
  ) then
    raise exception 'not authorized';
  end if;
  new_code := generate_join_code();
  update groups set join_code = new_code where id = p_group_id;
  return new_code;
end; $$;

grant execute on function rotate_join_code(uuid) to authenticated;

-- Joining by code is the student's own consenting action (entering a code
-- they were given), same as accepting an emailed invite — it directly
-- creates the membership row rather than another layer of pending state.
create or replace function join_group_by_code(p_code text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  target_group_id uuid;
begin
  select id into target_group_id from groups where join_code = upper(trim(p_code));
  if target_group_id is null then
    raise exception 'Invalid or expired code.';
  end if;
  insert into group_members (group_id, user_id, role)
  values (target_group_id, auth.uid(), 'member')
  on conflict do nothing;
  return target_group_id;
end; $$;

grant execute on function join_group_by_code(text) to authenticated;

-- 2. Daily submissions: one snapshot row per student per chabura per
-- local date (the student's own device computes the date, since the
-- server doesn't know their timezone — see TRANSLATION-BRIEF's "a day
-- ends at local midnight" rule, same principle here).
create table if not exists group_submissions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  submission_date date not null,
  payload jsonb not null,
  sent_at timestamptz not null default now(),
  unique (group_id, user_id, submission_date)
);

alter table group_submissions enable row level security;

-- A student sends (or resends, via upsert) only their own submission,
-- and only into a group they actually belong to.
create policy "students submit their own snapshot" on group_submissions
  for insert
  with check (
    user_id = auth.uid()
    and exists (select 1 from group_members where group_id = group_submissions.group_id and user_id = auth.uid())
  );

create policy "students overwrite their own snapshot" on group_submissions
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- A student sees their own history (the week strip); a teacher of that
-- group sees everyone's — this is the one place submission content
-- actually becomes visible to someone other than its author.
create policy "students see their own submissions" on group_submissions
  for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from group_members
      where group_id = group_submissions.group_id and user_id = auth.uid() and role = 'teacher'
    )
  );

-- Leaving a chabura takes the data with it (§5: "Leaving is one tap and
-- takes the data with it. Consent that cannot be withdrawn is not
-- consent.") — a student can delete their own rows; group_members'
-- existing leaveGroup() call now also needs to clear these, which the
-- app does explicitly rather than relying on cascade (leaving shouldn't
-- silently depend on delete order).
create policy "students delete their own submissions" on group_submissions
  for delete
  using (user_id = auth.uid());

create index if not exists group_submissions_group_date_idx on group_submissions (group_id, submission_date);

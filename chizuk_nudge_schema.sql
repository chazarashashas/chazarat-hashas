-- Chizuk nudge — one person sending encouragement to another, with an
-- optional note. See CHEVRUSA-CHABURA-BRIEF.md §3. A different feature
-- from the "nudge" strip already in the app (the sign-in prompt) — do
-- not confuse the two; this one is person-to-person, that one is
-- app-to-visitor.

create table if not exists group_nudges (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  from_user_id uuid not null references auth.users(id) on delete cascade,
  to_user_id uuid not null references auth.users(id) on delete cascade,
  note text,
  nudge_date date not null default current_date,
  created_at timestamptz not null default now(),
  -- One nudge per person per day, full stop — not one per sender. The
  -- first nudge to land that day is the one the recipient gets; anyone
  -- else who tries is told it already went today.
  unique (group_id, to_user_id, nudge_date)
);

alter table group_nudges enable row level security;

-- Any member of the group can see who's been nudged today (needed to
-- render "already nudged" correctly for everyone, not just the two
-- people involved) — the note text itself is only ever displayed to its
-- recipient by the client, but nothing here is sensitive enough to
-- warrant hiding row existence from other members of a small, private
-- study group.
create policy "group members can see nudges in their groups" on group_nudges
  for select
  using (is_group_member(group_id, auth.uid()));

-- Insert rules mirror the brief exactly: in a class chabura, only the
-- teacher may nudge, and only a talmid (never nudging another teacher,
-- which can't exist anyway with one rebbe per class); everywhere else
-- (a friends chabura, or a chevrusa) any member may nudge any other
-- member. Never yourself, either way.
create policy "members can send nudges per the class/friends rules" on group_nudges
  for insert
  with check (
    from_user_id = auth.uid()
    and to_user_id <> auth.uid()
    and is_group_member(group_id, auth.uid())
    and is_group_member(group_id, to_user_id)
    and (
      (not is_group_class(group_id) and true)
      or (is_group_class(group_id) and is_group_teacher(group_id, auth.uid()))
    )
  );

grant select, insert on group_nudges to authenticated;

-- Chevrusa/group RLS fix
-- Closes: (1) anyone could self-insert into any group as 'teacher',
-- bypassing the invite system entirely; (2) every teacher's identity was
-- exposed app-wide via an unscoped "role = 'teacher'" clause;
-- (3) group_activity inserts weren't checked against real membership.
-- Also adds UPDATE/DELETE on groups and UPDATE on profiles, which had no
-- policy at all for those commands (silently blocked for everyone).

-- is_group_member / is_group_teacher / is_group_class already exist in
-- the database (confirmed: recreating them here failed with "cannot
-- change name of input parameter", which only happens when a function
-- with that exact name and argument types is already present) — created
-- directly via the SQL editor at some point, never captured in a
-- committed file. Not redefined here; the policies below just call them.

-- 1. group_members: insert requires being the group's creator, or holding
--    a pending invite for this exact group — and you can never grant
--    yourself 'teacher' through the invite path, only the creator can.
drop policy if exists "users can add themselves as a member" on group_members;
drop policy if exists "users can add themselves as a member with a valid invite" on group_members;

create policy "users can add themselves as a member with a valid invite" on group_members
  for insert
  with check (
    user_id = auth.uid()
    and (
      exists (
        select 1 from groups g
        where g.id = group_members.group_id
          and g.created_by = auth.uid()
      )
      or (
        role <> 'teacher'
        and exists (
          select 1 from group_invites gi
          where gi.group_id = group_members.group_id
            and gi.invited_email = auth.email()
            and gi.status = 'pending'
        )
      )
    )
  );

-- 2. group_members: select — drop the unscoped "role = 'teacher'" leak
--    (exposed every teacher's identity for every group to every user),
--    replace with a version scoped to groups you actually belong to.
drop policy if exists "members can see fellow members" on group_members;

create policy "members can see fellow members" on group_members
  for select
  using (
    (user_id = auth.uid())
    or is_group_teacher(group_id, auth.uid())
    or (is_group_member(group_id, auth.uid()) and not is_group_class(group_id))
    or (is_group_member(group_id, auth.uid()) and role = 'teacher')
  );

-- 3. group_activity: insert requires actually belonging to the group.
drop policy if exists "users can upsert their own activity" on group_activity;
drop policy if exists "members can upsert their own activity" on group_activity;

create policy "members can upsert their own activity" on group_activity
  for insert
  with check (
    user_id = auth.uid()
    and is_group_member(group_id, auth.uid())
  );

-- 4. groups: no UPDATE/DELETE policy existed at all — updateGroupMasechet
--    in the app has been silently failing for everyone.
drop policy if exists "creator or teacher can update their group" on groups;

create policy "creator or teacher can update their group" on groups
  for update
  using (created_by = auth.uid() or is_group_teacher(id, auth.uid()))
  with check (created_by = auth.uid() or is_group_teacher(id, auth.uid()));

drop policy if exists "creator can delete their group" on groups;

create policy "creator can delete their group" on groups
  for delete
  using (created_by = auth.uid());

-- 5. profiles: no UPDATE policy existed — any rename-yourself feature
--    would be silently failing too.
drop policy if exists "you can update your own profile" on profiles;

create policy "you can update your own profile" on profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

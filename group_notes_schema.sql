-- Shared notes with attribution, editing and comments — a chevrusa or
-- chabura writing together against a specific mishnah, not a personal
-- note (see usePerekNotes for that). See CHEVRUSA-CHABURA-BRIEF.md §4.

create table if not exists group_notes (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  masechet_en text not null,
  perek integer not null,
  mishnah integer not null,
  body text not null,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);

create table if not exists group_note_comments (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references group_notes(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table group_notes enable row level security;
alter table group_note_comments enable row level security;

create policy "group members can read notes" on group_notes
  for select
  using (is_group_member(group_id, auth.uid()));

create policy "group members can write notes" on group_notes
  for insert
  with check (author_id = auth.uid() and is_group_member(group_id, auth.uid()));

-- Only the author may edit their own note; nobody edits anyone else's.
create policy "authors can edit their own notes" on group_notes
  for update
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy "authors can delete their own notes" on group_notes
  for delete
  using (author_id = auth.uid());

-- Comments: readable/insertable by anyone in the note's group — checked
-- via a join back to group_notes rather than duplicating group_id here,
-- so a comment can never end up scoped to the wrong group.
create policy "group members can read comments" on group_note_comments
  for select
  using (exists (
    select 1 from group_notes n
    where n.id = group_note_comments.note_id
      and is_group_member(n.group_id, auth.uid())
  ));

create policy "group members can add comments" on group_note_comments
  for insert
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from group_notes n
      where n.id = group_note_comments.note_id
        and is_group_member(n.group_id, auth.uid())
    )
  );

grant select, insert, update, delete on group_notes to authenticated;
grant select, insert on group_note_comments to authenticated;

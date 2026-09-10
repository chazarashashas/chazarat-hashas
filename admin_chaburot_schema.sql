-- Lets an admin see the chaburot without being in them.
--
-- ADMIN-PROPOSAL.md §2: "nobody can answer 'why is my talmid missing'
-- without seeing what the rebbe sees". The normal group policies scope
-- every read to your own membership, which is correct for students and
-- useless for support, so this is a security-definer view of the same
-- data with an is_admin check in front of it.
--
-- Read-only by design. There is deliberately no admin function to edit,
-- create or delete a group here: ADMIN-PROPOSAL.md's "admin-created
-- chaburot" is a real feature with its own product questions (who is the
-- teacher, what do the invited see) and it is not support work.

create or replace function admin_list_groups()
returns table (
  id uuid,
  name text,
  masechet_en text,
  is_chabura boolean,
  is_class boolean,
  created_at timestamptz,
  member_count bigint,
  teacher_email text
)
language sql security definer set search_path = public as $$
  select
    g.id,
    g.name,
    g.masechet_en,
    g.is_chabura,
    g.is_class,
    g.created_at,
    (select count(*) from group_members m where m.group_id = g.id) as member_count,
    (
      select u.email
      from group_members m
      join auth.users u on u.id = m.user_id
      where m.group_id = g.id and m.role = 'teacher'
      limit 1
    ) as teacher_email
  from groups g
  where exists (select 1 from profiles where id = auth.uid() and is_admin)
  order by g.created_at desc;
$$;

-- One group's roster, for the "what does the rebbe see" view.
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

grant execute on function admin_list_groups() to authenticated;
grant execute on function admin_group_members(uuid) to authenticated;

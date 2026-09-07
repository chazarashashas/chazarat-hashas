-- Admin dashboard setup.
-- Adds an is_admin flag (default false, no one gets it automatically) and
-- two SECURITY DEFINER functions that check that flag before returning
-- cross-user data — this is deliberately NOT done by loosening RLS, since
-- that would reopen exactly the holes the last two fixes closed. Every
-- other user's queries stay exactly as locked-down as they are today;
-- only these two functions, called explicitly, check "is the caller an
-- admin?" first.

alter table profiles add column if not exists is_admin boolean not null default false;
alter table profiles add column if not exists city text;
alter table profiles add column if not exists country text;

-- One-time repair: creates a profiles row (blank — just the id) for any
-- account that signed up but never got one, so accounts that already
-- exist today are covered even before the admin_list_users fix below
-- makes future gaps merely cosmetic instead of invisible. Safe to re-run.
insert into profiles (id)
select u.id from auth.users u
left join profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

-- Marks these accounts as admin. Run once (safe to re-run — it's just a
-- set, not an insert).
update profiles set is_admin = true
where id = (select id from auth.users where email = 'chazarashashas@gmail.com');

update profiles set is_admin = true
where id = (select id from auth.users where email = 'yonah.rossman@gmail.com');

-- Aggregate counts only — no per-user content.
create or replace function admin_overview()
returns table (
  total_users bigint,
  total_groups bigint,
  total_chaburot bigint,
  total_chevrusot bigint,
  total_siyumim bigint,
  total_claims bigint,
  learned_claims bigint,
  open_perakim bigint
)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_admin) then
    raise exception 'not authorized';
  end if;
  return query select
    -- auth.users, not profiles: a signup whose profiles row never got
    -- created (the trigger that creates it didn't fire, or hasn't run
    -- yet) still counts as a real user instead of silently vanishing.
    (select count(*) from auth.users),
    (select count(*) from groups),
    (select count(*) from groups where is_chabura),
    (select count(*) from groups where not is_chabura),
    (select count(*) from nishmat_siyumim),
    (select count(*) from nishmat_perakim),
    (select count(*) from nishmat_perakim where learned),
    (select count(*) from nishmat_perakim where claimed_by_user_id is null and claimed_by_name is null);
end; $$;

grant execute on function admin_overview() to authenticated;

-- Per-user list: email/name/signup date plus a rough progress figure
-- read from user_data's synced "completions" array, where present.
create or replace function admin_list_users()
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
  mishnayot_learned bigint
)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin) then
    raise exception 'not authorized';
  end if;
  -- Starts from auth.users, not profiles: the previous version (`from
  -- profiles join auth.users`) silently dropped any account whose
  -- profiles row was never created — exactly the accounts most worth
  -- an admin noticing. A user with no profile row just shows every
  -- profile field as null (the UI already renders that as "—").
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
    coalesce(jsonb_array_length(ud.data->'completions'), 0)::bigint
  from auth.users u
  left join profiles p on p.id = u.id
  left join user_data ud on ud.user_id = u.id
  order by u.created_at desc;
end; $$;

grant execute on function admin_list_users() to authenticated;

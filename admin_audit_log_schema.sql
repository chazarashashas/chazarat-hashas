-- The audit log for privileged actions.
--
-- A super admin can already reset another account's progress, delete an
-- account outright, and grant a role. Until this table existed, none of
-- that left a record anywhere: there was no way to answer "who deleted
-- this account, and when". That is the exposure this closes — the log is
-- not for the panel's sake, it is because those capabilities already
-- exist unlogged (ADMIN-PROPOSAL.md §2).
--
-- Append-only by construction: there is no update or delete policy, and
-- the write goes through a security-definer function rather than a
-- direct insert, so a caller cannot forge the actor.

create table if not exists admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  -- Who did it. Never nullable: an entry with no actor is not an audit
  -- record. Kept even if the actor's account is later deleted, which is
  -- exactly when the log matters most, hence on delete set null on the
  -- FK rather than cascade.
  actor_id uuid references auth.users (id) on delete set null,
  actor_email text not null,
  -- What they did: reset_user_data, delete_user, grant_role, revoke_role,
  -- view_as. Text rather than an enum so adding an action later is a
  -- migration-free change on the client side.
  action text not null,
  -- Who it was done to, where there is a target.
  target_id uuid,
  target_email text,
  -- Anything action-specific: the reset scope, the role granted, and so
  -- on. Small by design — this is a log, not an event store.
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_at_idx on admin_audit_log (created_at desc);
create index if not exists admin_audit_log_target_idx on admin_audit_log (target_id);

alter table admin_audit_log enable row level security;

-- Read: admins only. There is deliberately no insert, update or delete
-- policy — every write goes through log_admin_action below, and nothing
-- may edit or remove an entry once written, including an admin.
drop policy if exists "admins read audit log" on admin_audit_log;
create policy "admins read audit log" on admin_audit_log
  for select using (exists (select 1 from profiles where id = auth.uid() and is_admin));

-- Writes one entry, attributing it to the calling admin. The actor is
-- taken from auth.uid() rather than an argument, so a caller cannot
-- write an entry naming somebody else.
create or replace function log_admin_action(
  p_action text,
  p_target_id uuid default null,
  p_target_email text default null,
  p_detail jsonb default '{}'::jsonb
)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_email text;
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_admin) then
    raise exception 'not authorized';
  end if;

  select email into v_email from auth.users where id = auth.uid();

  insert into admin_audit_log (actor_id, actor_email, action, target_id, target_email, detail)
  values (auth.uid(), coalesce(v_email, 'unknown'), p_action, p_target_id, p_target_email, p_detail);
end;
$$;

-- The list view. Parameterless overload included on purpose: the panel
-- calls it with no arguments for the default page, and PostgREST needs
-- the no-argument form to exist for that to resolve (the missing
-- parameterless overload is exactly what produced the "Could not find
-- the function ... without parameters in the schema cache" error that
-- started this work).
create or replace function admin_audit_log_list(p_limit int default 100)
returns table (
  id uuid,
  actor_email text,
  action text,
  target_email text,
  detail jsonb,
  created_at timestamptz
)
language sql security definer set search_path = public as $$
  select l.id, l.actor_email, l.action, l.target_email, l.detail, l.created_at
  from admin_audit_log l
  where exists (select 1 from profiles where id = auth.uid() and is_admin)
  order by l.created_at desc
  limit greatest(1, least(coalesce(p_limit, 100), 500));
$;

grant execute on function log_admin_action(text, uuid, text, jsonb) to authenticated;
grant execute on function admin_audit_log_list(int) to authenticated;

-- No role-granting function here on purpose. ADMIN-PROPOSAL.md §2 assumes
-- "rebbe status is presumably set by hand in the database now" and asks
-- for a grant path. It is not: isRebbe() in useChevrusa.ts derives the
-- role from being the teacher of a class chabura, so there is no flag to
-- grant and adding one would give the app two disagreeing answers to
-- "is this person a rebbe". Making it grantable is a real product change
-- (what happens to a granted rebbe who teaches nothing?), not a panel
-- feature, so the panel shows where the role comes from instead.

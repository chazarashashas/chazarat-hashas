-- Admin: live "today" activity grid.
-- Same shape as the rebbe dashboard's grid, but for every account at
-- once and read directly rather than through group_submissions — the
-- superadmin already has visibility rights, so nothing needs to be
-- "sent" first. Reads each user's own user_data JSONB blob (already
-- synced there by useCloudSync) for today's figures.
--
-- "Today" is evaluated in the database's session timezone, not each
-- user's own local midnight — an acceptable approximation for a
-- cross-timezone overview, unlike the per-student submission flow where
-- the student's own device decides its date.

create or replace function admin_activity_today()
returns table (
  id uuid,
  first_name text,
  username text,
  limmud_count bigint,
  quiz_score int,
  quiz_out_of int,
  sidrei_placed int,
  sidrei_total int,
  sort_placed int,
  sort_total int,
  dash_score int,
  chazara_count int
)
language plpgsql security definer set search_path = public as $$
declare
  today text := to_char(now(), 'YYYY-MM-DD');
begin
  if not exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin) then
    raise exception 'not authorized';
  end if;
  return query
  select
    p.id,
    p.first_name,
    p.username,
    coalesce((
      select count(*)
      from jsonb_array_elements(coalesce(ud.data->'completions', '[]'::jsonb)) c
      where (c->>'date') = today
    ), 0) as limmud_count,
    case when (ud.data->'gameStats'->'quiz'->'today'->>'date') = today
      then (ud.data->'gameStats'->'quiz'->'today'->>'bestScore')::int end,
    case when (ud.data->'gameStats'->'quiz'->'today'->>'date') = today
      then (ud.data->'gameStats'->'quiz'->'today'->>'bestOutOf')::int end,
    case when (ud.data->'gameStats'->'sidrei'->'today'->>'date') = today
      then (ud.data->'gameStats'->'sidrei'->'today'->>'placed')::int end,
    case when (ud.data->'gameStats'->'sidrei'->'today'->>'date') = today
      then (ud.data->'gameStats'->'sidrei'->'today'->>'total')::int end,
    case when (ud.data->'gameStats'->'sort'->'today'->>'date') = today
      then (ud.data->'gameStats'->'sort'->'today'->>'placed')::int end,
    case when (ud.data->'gameStats'->'sort'->'today'->>'date') = today
      then (ud.data->'gameStats'->'sort'->'today'->>'total')::int end,
    case when (ud.data->'gameStats'->'dash'->'today'->>'date') = today
      then (ud.data->'gameStats'->'dash'->'today'->>'bestScore')::int end,
    case when (ud.data->'gameStats'->'chazara'->'today'->>'date') = today
      then (ud.data->'gameStats'->'chazara'->'today'->>'bestCount')::int end
  from profiles p
  left join user_data ud on ud.user_id = p.id
  order by p.created_at desc;
end; $$;

grant execute on function admin_activity_today() to authenticated;

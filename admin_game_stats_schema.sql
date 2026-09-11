-- Admin: every account's Practice game record, all time.
-- The "Today" grid (admin_activity_today) only shows today's figures;
-- this returns the whole gameStats record — best scores, times played,
-- and today's best — so the admin panel can show a game's scores across
-- every account and a user's scores in their drawer.
--
-- Reads only the gameStats key of each user's user_data blob (synced
-- there by useCloudSync) — never notes, concepts or anything else in
-- that blob. Games played while signed out never reach user_data, so
-- they are not here.
--
-- Safe to re-run.

create or replace function admin_game_stats()
returns table (
  id uuid,
  game_stats jsonb
)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin) then
    raise exception 'not authorized';
  end if;
  return query
  select ud.user_id, ud.data->'gameStats'
  from user_data ud
  where ud.data ? 'gameStats';
end; $$;

grant execute on function admin_game_stats() to authenticated;

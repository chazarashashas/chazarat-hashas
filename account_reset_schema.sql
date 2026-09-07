-- Lets an admin reset a specific user's learning trackers on their
-- behalf (self-service reset is client-side only — see useAccountReset —
-- and doesn't need any SQL of its own).
--
-- reset_requested_at is also read by the client's own self-service reset
-- (useCloudSync's applyReset) so every one of an account's devices can
-- tell a reset happened rather than merging its own stale copy of the
-- same fields back in over the top of it. Run this before (or alongside)
-- deploying that client change — useCloudSync falls back gracefully if
-- this column doesn't exist yet, but a reset made before this is run
-- won't be reset-timestamped for other devices to notice.

alter table user_data add column if not exists reset_requested_at timestamptz;

-- Resets one named group of trackers (or all of them) for another user's
-- account — never arbitrary columns, so a caller can't reset something
-- outside this fixed, reviewed list. Sets each affected key to its own
-- hook's actual empty default (never removes the key — see applyReset's
-- own doc comment for why an explicit empty value matters here).
create or replace function admin_reset_user_data(p_user_id uuid, p_scope text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  patch jsonb;
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_admin) then
    raise exception 'not authorized';
  end if;

  patch := case p_scope
    when 'daily_limmud' then jsonb_build_object(
      'completions', '[]'::jsonb,
      'dailyLimmudPosition', 0,
      'dailyLimmudPace', '"1"'::jsonb,
      'streakFreezes', 2,
      'frozenDates', '[]'::jsonb,
      'lastFreezeMilestone', 0
    )
    when 'perek_notes' then jsonb_build_object(
      'perekNotes', '{}'::jsonb,
      'perekNotebook', '{}'::jsonb,
      'masechetSentences', '{}'::jsonb
    )
    when 'concepts' then jsonb_build_object('conceptNotes', '[]'::jsonb)
    when 'game_stats' then jsonb_build_object('gameStats', '{}'::jsonb)
    when 'everything' then
      jsonb_build_object(
        'completions', '[]'::jsonb,
        'dailyLimmudPosition', 0,
        'dailyLimmudPace', '"1"'::jsonb,
        'streakFreezes', 2,
        'frozenDates', '[]'::jsonb,
        'lastFreezeMilestone', 0,
        'perekNotes', '{}'::jsonb,
        'perekNotebook', '{}'::jsonb,
        'masechetSentences', '{}'::jsonb,
        'conceptNotes', '[]'::jsonb,
        'gameStats', '{}'::jsonb
      )
    else null
  end;

  if patch is null then
    raise exception 'unknown reset scope: %', p_scope;
  end if;

  insert into user_data (user_id, data, reset_requested_at, updated_at)
  values (p_user_id, patch, now(), now())
  on conflict (user_id) do update
    set data = user_data.data || patch,
        reset_requested_at = now(),
        updated_at = now();
end; $$;

grant execute on function admin_reset_user_data(uuid, text) to authenticated;

-- Fixes "Database error saving new user" on Google sign-in.
--
-- handle_new_user() — the trigger on auth.users that creates each new
-- account's profiles row — was never in this repo (created directly in
-- the Supabase dashboard at some point, same as a few other functions
-- found earlier). Its insert used
--   new.raw_user_meta_data->>'username'
-- with no fallback. Email sign-up always supplies a username (see
-- useAuth.tsx's signUp, which passes it in options.data), so that path
-- worked. Google sign-in never sets raw_user_meta_data at all — Google
-- doesn't collect a username — so the value was null, profiles.username
-- is NOT NULL, the insert failed, the trigger's failure rolled back the
-- whole auth.users insert (triggers run in the same transaction), and
-- Supabase reported that back as "Database error saving new user" —
-- silently, until the redirect-URL fix made errors visible at all.
--
-- Same fallback already used in admin_setup.sql's one-time backfill for
-- pre-existing accounts missing a profiles row: the user's own id makes
-- a guaranteed-unique placeholder. Safe to re-run.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $function$
begin
  insert into public.profiles (id, username, first_name, last_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || new.id::text),
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name'
  );
  return new;
end;
$function$;

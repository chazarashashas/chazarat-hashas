-- Follow-up to fix_google_signup_trigger.sql: that fix stopped Google
-- sign-in from failing outright, but it left first_name/last_name null
-- for every Google account, since the trigger only ever read
-- raw_user_meta_data's 'first_name'/'last_name' keys — the keys email
-- sign-up sets explicitly, not what Google's OAuth response actually
-- uses. The app's own display-name logic prefers first_name over
-- username (see useAuth.tsx / AccountDashboard's displayName), so a
-- null first_name was what surfaced the placeholder username
-- ("user_4ebd34b1-...") as someone's visible name at all.
--
-- Google's OAuth response populates given_name/family_name (also name,
-- full_name, picture, email — standard fields Supabase's Google
-- provider passes through as-is). This adds them as a second fallback,
-- so a Google sign-in gets their real name and only the username field
-- itself — never shown as the primary name once first_name is set —
-- stays a placeholder.
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
    coalesce(new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'given_name'),
    coalesce(new.raw_user_meta_data->>'last_name', new.raw_user_meta_data->>'family_name')
  );
  return new;
end;
$function$;

-- One-time repair for the test Google account already created with the
-- placeholder name (and anyone else who signed in with Google between
-- the two fixes). Backfills first_name/last_name from Google's own
-- metadata for any profile that still has a null first_name and a
-- matching auth.users row with given_name/family_name available. Safe
-- to re-run — only touches rows still missing a first_name.
update public.profiles p
set
  first_name = coalesce(p.first_name, u.raw_user_meta_data->>'given_name'),
  last_name = coalesce(p.last_name, u.raw_user_meta_data->>'family_name')
from auth.users u
where u.id = p.id
  and p.first_name is null
  and u.raw_user_meta_data->>'given_name' is not null;

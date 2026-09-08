-- Follow-up to fix_google_signup_display_name.sql. Confirmed via
-- diagnose_display_name.sql that for real Google accounts on this app,
-- raw_user_meta_data has NO given_name/family_name at all — only a
-- single combined 'name' field (e.g. "Yonah Rossman"). The previous fix
-- only ever looked for given_name/family_name, so first_name/last_name
-- stayed null and the placeholder username ("user_<uuid>") kept
-- surfacing as the visible display name.
--
-- This adds a third fallback: split 'name' on the first space. No
-- space found (single-word name) -> the whole thing becomes first_name,
-- last_name stays null, same as a real single-name signup would look.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $function$
declare
  full_name text := new.raw_user_meta_data->>'name';
  space_pos int := nullif(strpos(new.raw_user_meta_data->>'name', ' '), 0);
begin
  insert into public.profiles (id, username, first_name, last_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || new.id::text),
    coalesce(
      new.raw_user_meta_data->>'first_name',
      new.raw_user_meta_data->>'given_name',
      case when full_name is null then null
           when space_pos is null then full_name
           else substring(full_name from 1 for space_pos - 1)
      end
    ),
    coalesce(
      new.raw_user_meta_data->>'last_name',
      new.raw_user_meta_data->>'family_name',
      case when space_pos is null then null
           else substring(full_name from space_pos + 1)
      end
    )
  );
  return new;
end;
$function$;

-- One-time repair for every already-created Google account still stuck
-- on the placeholder (this covers the account confirmed broken above,
-- and anyone else in the same boat).
update public.profiles p
set
  first_name = coalesce(p.first_name, split.first_part),
  last_name  = coalesce(p.last_name, split.last_part)
from (
  select
    u.id,
    case when strpos(u.raw_user_meta_data->>'name', ' ') > 0
      then substring(u.raw_user_meta_data->>'name' from 1 for strpos(u.raw_user_meta_data->>'name', ' ') - 1)
      else u.raw_user_meta_data->>'name'
    end as first_part,
    case when strpos(u.raw_user_meta_data->>'name', ' ') > 0
      then substring(u.raw_user_meta_data->>'name' from strpos(u.raw_user_meta_data->>'name', ' ') + 1)
      else null
    end as last_part
  from auth.users u
  where u.raw_user_meta_data->>'name' is not null
) as split
where split.id = p.id
  and p.first_name is null;

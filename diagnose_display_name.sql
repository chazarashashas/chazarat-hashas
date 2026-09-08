-- Diagnostic only, changes nothing. Shows exactly what Google actually
-- sent us vs. what's stored in profiles, for every Google sign-up.
select
  u.id,
  u.email,
  u.raw_user_meta_data ->> 'given_name'  as google_given_name,
  u.raw_user_meta_data ->> 'family_name' as google_family_name,
  u.raw_user_meta_data ->> 'name'        as google_full_name,
  p.username,
  p.first_name as profile_first_name,
  p.last_name  as profile_last_name
from auth.users u
join public.profiles p on p.id = u.id
where u.raw_app_meta_data ->> 'provider' = 'google'
order by u.created_at desc;

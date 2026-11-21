alter table public.profiles add column if not exists username text;

update public.profiles as profile
set username = nullif(auth_user.raw_user_meta_data ->> 'username', '')
from auth.users as auth_user
where auth_user.id = profile.id
  and profile.username is null
  and nullif(auth_user.raw_user_meta_data ->> 'username', '') is not null;

create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username)) where username is not null;

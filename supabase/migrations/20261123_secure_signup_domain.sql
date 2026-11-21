alter table public.profiles
  alter column approval_status set default 'pending';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  campus_id uuid;
  campus_email_domain text;
  requested_role public.user_role := 'student';
begin
  select id, email_domain
  into campus_id, campus_email_domain
  from public.colleges
  where slug = 'kcc' and is_active
  limit 1;

  if campus_email_domain is not null
    and lower(split_part(new.email, '@', 2)) <> lower(regexp_replace(trim(campus_email_domain), '^@', ''))
  then
    raise exception 'Use an email address from the KCC Institute domain';
  end if;

  if new.raw_user_meta_data ->> 'role' = 'admin' then
    requested_role := 'admin';
  end if;

  insert into public.profiles (
    id, college_id, role, approval_status, approval_requested_role, email, full_name
  )
  values (
    new.id,
    campus_id,
    'student',
    'pending',
    requested_role,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(public.profiles.full_name, excluded.full_name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

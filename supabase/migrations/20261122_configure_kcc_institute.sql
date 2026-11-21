insert into public.colleges (name, slug, address, is_active)
values ('KCC Institute', 'kcc', 'KCC Institute Campus', true)
on conflict (slug) do update
set name = excluded.name,
    address = excluded.address,
    is_active = true;

drop policy if exists "Public read KCC Institute" on public.colleges;
create policy "Public read KCC Institute"
on public.colleges for select
using (slug = 'kcc' and is_active = true);

insert into public.buildings (college_id, name, code, is_active)
select kcc.id, block.name, block.code, true
from public.colleges kcc
cross join (values
  ('KCC Block A', 'KCC-A'),
  ('KCC Block B', 'KCC-B'),
  ('KCC Block C', 'KCC-C')
) as block(name, code)
where kcc.slug = 'kcc'
on conflict (college_id, code) do update
set name = excluded.name,
    is_active = true;

update public.profiles
set college_id = (select id from public.colleges where slug = 'kcc' limit 1)
where role <> 'super_admin';

-- Remove only the two sample tenants that were previously shipped in seed.sql.
delete from public.messages
where college_id in (select id from public.colleges where slug in ('north-campus', 'south-campus'));

delete from public.reports
where college_id in (select id from public.colleges where slug in ('north-campus', 'south-campus'));

delete from public.colleges
where slug in ('north-campus', 'south-campus');

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, college_id, role, email, full_name)
  values (
    new.id,
    (select id from public.colleges where slug = 'kcc' limit 1),
    'student'::public.user_role,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update
  set college_id = coalesce(public.profiles.college_id, excluded.college_id),
      email = excluded.email,
      full_name = coalesce(public.profiles.full_name, excluded.full_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

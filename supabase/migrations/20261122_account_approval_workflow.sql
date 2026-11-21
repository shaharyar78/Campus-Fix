alter table public.profiles
  add column if not exists approval_status text not null default 'approved'
    check (approval_status in ('pending', 'approved', 'rejected')),
  add column if not exists approval_requested_role public.user_role,
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists approved_at timestamptz;

update public.profiles
set approval_requested_role = role,
    approved_at = coalesce(approved_at, created_at)
where approval_requested_role is null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.user_role;
begin
  requested_role := 'student'::public.user_role;
  if (new.raw_user_meta_data ->> 'role') = 'admin' then
    requested_role := 'admin'::public.user_role;
  end if;

  insert into public.profiles (
    id,
    college_id,
    role,
    approval_status,
    approval_requested_role,
    email,
    full_name
  )
  values (
    new.id,
    (select id from public.colleges where slug = 'kcc' limit 1),
    'student'::public.user_role,
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

drop policy if exists "Admins approve students" on public.profiles;
create policy "Admins approve students"
on public.profiles for update
using (
  public.is_college_admin()
  and college_id = public.current_profile_college()
  and role = 'student'
  and approval_status = 'pending'
  and approval_requested_role = 'student'
)
with check (
  public.is_college_admin()
  and college_id = public.current_profile_college()
  and role = 'student'
  and approval_status in ('approved', 'rejected')
  and approval_requested_role = 'student'
);

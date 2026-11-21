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

create or replace function public.current_profile_college()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select college_id
  from public.profiles
  where id = auth.uid()
    and approval_status = 'approved';
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'super_admin'
      and approval_status = 'approved'
  );
$$;

create or replace function public.is_college_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and approval_status = 'approved'
  );
$$;

drop policy if exists "Users update own profile" on public.profiles;
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
  and approved_by = auth.uid()
);

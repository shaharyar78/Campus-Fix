-- Profile defaults and role/college protection
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, college_id, role, full_name, email)
  values (
    new.id,
    null,
    'student'::public.user_role,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do update
  set full_name = coalesce(excluded.full_name, public.profiles.full_name),
      email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Prevent users from changing role or college from a profile update.
drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
on public.profiles for update
using (id = auth.uid())
with check (
  id = auth.uid()
  and role = (select p.role from public.profiles p where p.id = auth.uid())
  and college_id = (select p.college_id from public.profiles p where p.id = auth.uid())
);

-- Keep report status changes in the timeline.
create or replace function public.record_report_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  update_author uuid;
begin
  if old.status is distinct from new.status then
    update_author := coalesce(auth.uid(), new.assigned_to, new.submitter_id);

    insert into public.report_updates (
      report_id,
      author_id,
      status,
      message
    )
    values (
      new.id,
      update_author,
      new.status,
      'Status changed from ' || old.status::text || ' to ' || new.status::text
    );
  end if;

  return new;
end;
$$;

drop trigger if exists reports_record_status_change on public.reports;
create trigger reports_record_status_change
after update of status on public.reports
for each row execute function public.record_report_status_change();

-- Synchronize upvote_count with report_upvotes after an import or manual repair.
update public.reports r
set upvote_count = (
  select count(*)
  from public.report_upvotes u
  where u.report_id = r.id
);
-- Newly created students receive a profile before a college is assigned.
alter table public.profiles drop constraint if exists profiles_college_for_member;


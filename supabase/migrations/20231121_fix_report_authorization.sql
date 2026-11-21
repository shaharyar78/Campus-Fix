-- Student submitters must not update status, ownership, college, or upvote fields.
drop policy if exists "Submitters update own reports" on public.reports;

create or replace function public.prevent_unauthorized_report_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role public.user_role;
begin
  select role into caller_role
  from public.profiles
  where id = auth.uid();

  if caller_role = 'student'
     and (
       old.status is distinct from new.status
       or old.assigned_to is distinct from new.assigned_to
       or old.resolved_at is distinct from new.resolved_at
       or old.upvote_count is distinct from new.upvote_count
       or old.college_id is distinct from new.college_id
       or old.submitter_id is distinct from new.submitter_id
     )
  then
    raise exception 'Students cannot update protected report fields';
  end if;

  if caller_role = 'admin'
     and old.college_id is distinct from new.college_id
  then
    raise exception 'Admins cannot transfer reports between colleges';
  end if;

  if caller_role = 'admin'
     and old.college_id <> public.current_profile_college()
  then
    raise exception 'Admins cannot update reports outside their college';
  end;

  return new;
end;
$$;

drop trigger if exists prevent_unauthorized_report_updates on public.reports;
create trigger prevent_unauthorized_report_updates
before update on public.reports
for each row execute function public.prevent_unauthorized_report_updates();

-- Allow approved campus users to use the general campus chat while keeping
-- report conversations scoped to their submitter and campus administrators.
-- Remove legacy anonymous chat policies that bypassed the intended checks.
drop policy if exists "Allow chat read" on public.messages;
drop policy if exists "Allow chat send" on public.messages;

drop policy if exists "Users read college messages" on public.messages;
create policy "Users read college messages"
on public.messages for select
to authenticated
using (
  (select public.is_super_admin())
  or (
    college_id = (select public.current_profile_college())
    and (
      report_id is null
      or (select public.is_college_admin())
      or sender_id = (select auth.uid())
      or exists (
        select 1
        from public.reports r
        where r.id = messages.report_id
          and r.college_id = messages.college_id
          and r.submitter_id = (select auth.uid())
      )
    )
  )
);

drop policy if exists "Users create messages" on public.messages;
create policy "Users create messages"
on public.messages for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and (
    (select public.is_super_admin())
    or (
      college_id = (select public.current_profile_college())
      and (
        report_id is null
        or (select public.is_college_admin())
        or exists (
          select 1
          from public.reports r
          where r.id = messages.report_id
            and r.submitter_id = (select auth.uid())
            and r.college_id = messages.college_id
        )
      )
    )
  )
  and (
    report_id is null
    or exists (
      select 1
      from public.reports r
      where r.id = messages.report_id
        and r.college_id = messages.college_id
    )
  )
);

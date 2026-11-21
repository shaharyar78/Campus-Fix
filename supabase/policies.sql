-- CampusFix Row Level Security

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
    select 1
    from public.profiles
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
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and approval_status = 'approved'
  );
$$;

alter table public.colleges enable row level security;
alter table public.profiles enable row level security;
alter table public.buildings enable row level security;
alter table public.reports enable row level security;
alter table public.report_upvotes enable row level security;
alter table public.report_updates enable row level security;
alter table public.messages enable row level security;

-- Colleges
drop policy if exists "Public read KCC Institute" on public.colleges;
drop policy if exists "Public read active colleges" on public.colleges;
create policy "Public read active colleges"
on public.colleges for select
using (is_active = true);

drop policy if exists "Users read their college" on public.colleges;
create policy "Users read their college"
on public.colleges for select
using (
  public.is_super_admin()
  or id = public.current_profile_college()
);

drop policy if exists "Super admins manage colleges" on public.colleges;
create policy "Super admins manage colleges"
on public.colleges for all
using (public.is_super_admin())
with check (public.is_super_admin());

-- Profiles
drop policy if exists "Users read accessible profiles" on public.profiles;
create policy "Users read accessible profiles"
on public.profiles for select
using (
  id = auth.uid()
  or public.is_super_admin()
  or (
    public.is_college_admin()
    and college_id = public.current_profile_college()
  )
);

drop policy if exists "Users update own profile" on public.profiles;

drop policy if exists "Super admins manage profiles" on public.profiles;
create policy "Super admins manage profiles"
on public.profiles for all
using (public.is_super_admin())
with check (public.is_super_admin());

-- Buildings
drop policy if exists "Users read college buildings" on public.buildings;
create policy "Users read college buildings"
on public.buildings for select
using (
  public.is_super_admin()
  or college_id = public.current_profile_college()
);

drop policy if exists "College admins manage buildings" on public.buildings;
create policy "College admins manage buildings"
on public.buildings for all
using (
  public.is_super_admin()
  or (
    public.is_college_admin()
    and college_id = public.current_profile_college()
  )
)
with check (
  public.is_super_admin()
  or (
    public.is_college_admin()
    and college_id = public.current_profile_college()
  )
);

-- Reports
drop policy if exists "Users read college reports" on public.reports;
create policy "Users read college reports"
on public.reports for select
using (
  public.is_super_admin()
  or (
    college_id = public.current_profile_college()
    and (
      submitter_id = auth.uid()
      or public.is_college_admin()
    )
  )
);

drop policy if exists "Students create reports" on public.reports;
create policy "Students create reports"
on public.reports for insert
with check (
  auth.uid() is not null
  and submitter_id = auth.uid()
  and college_id = public.current_profile_college()
);

drop policy if exists "Submitters update own reports" on public.reports;

drop policy if exists "Admins manage college reports" on public.reports;
create policy "Admins manage college reports"
on public.reports for all
using (
  public.is_super_admin()
  or (
    public.is_college_admin()
    and college_id = public.current_profile_college()
  )
)
with check (
  public.is_super_admin()
  or (
    public.is_college_admin()
    and college_id = public.current_profile_college()
  )
);

-- Report upvotes
drop policy if exists "Users read report upvotes" on public.report_upvotes;
create policy "Users read report upvotes"
on public.report_upvotes for select
using (
  exists (
    select 1
    from public.reports r
    where r.id = report_upvotes.report_id
      and (
        public.is_super_admin()
        or r.college_id = public.current_profile_college()
      )
  )
);

drop policy if exists "Students manage own upvotes" on public.report_upvotes;
create policy "Students manage own upvotes"
on public.report_upvotes for all
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.reports r
    where r.id = report_upvotes.report_id
      and r.college_id = public.current_profile_college()
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.reports r
    where r.id = report_upvotes.report_id
      and r.college_id = public.current_profile_college()
  )
);

-- Report timeline updates
drop policy if exists "Users read college report updates" on public.report_updates;
create policy "Users read college report updates"
on public.report_updates for select
using (
  exists (
    select 1
    from public.reports r
    where r.id = report_updates.report_id
      and (
        public.is_super_admin()
        or (
          r.college_id = public.current_profile_college()
          and (
            r.submitter_id = auth.uid()
            or public.is_college_admin()
          )
        )
      )
  )
);

drop policy if exists "Admins create report updates" on public.report_updates;
create policy "Admins create report updates"
on public.report_updates for insert
with check (
  author_id = auth.uid()
  and exists (
    select 1
    from public.reports r
    where r.id = report_updates.report_id
      and (
        public.is_super_admin()
        or (
          public.is_college_admin()
          and r.college_id = public.current_profile_college()
        )
      )
  )
);

-- Chat messages
drop policy if exists "Users read college messages" on public.messages;
create policy "Users read college messages"
on public.messages for select
using (
  public.is_super_admin()
  or (
    college_id = public.current_profile_college()
    and (
      public.is_college_admin()
      or sender_id = auth.uid()
      or exists (
        select 1
        from public.reports r
        where r.id = messages.report_id
          and r.submitter_id = auth.uid()
      )
    )
  )
);

drop policy if exists "Users create messages" on public.messages;
create policy "Users create messages"
on public.messages for insert
with check (
  sender_id = auth.uid()
  and (
    public.is_super_admin()
    or (
      college_id = public.current_profile_college()
      and (
        public.is_college_admin()
        or exists (
          select 1
          from public.reports r
          where r.id = messages.report_id
            and r.submitter_id = auth.uid()
            and r.college_id = public.current_profile_college()
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

-- =============================================================================
-- CampusFix: Squashed baseline for fresh databases.
-- Subsequent historical migration versions are retained as no-ops for history alignment.
-- =============================================================================

create extension if not exists "pgcrypto";

-- Enums
do $$ begin create type public.user_role as enum ('student', 'admin', 'super_admin'); exception when duplicate_object then null; end $$;
do $$ begin create type public.report_status as enum ('submitted', 'under_review', 'assigned', 'in_progress', 'resolved', 'rejected', 'closed'); exception when duplicate_object then null; end $$;
do $$ begin create type public.report_category as enum ('electrical', 'plumbing', 'cleanliness', 'internet', 'furniture', 'safety', 'other'); exception when duplicate_object then null; end $$;

-- Tables
create table if not exists public.colleges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  email_domain text,
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  college_id uuid references public.colleges(id) on delete restrict,
  role public.user_role not null default 'student',
  full_name text,
  username text,
  email text,
  avatar_url text,
  approval_status text not null default 'pending'
    check (approval_status in ('pending', 'approved', 'rejected')),
  approval_requested_role public.user_role,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username)) where username is not null;

create table if not exists public.buildings (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  name text not null,
  code text,
  floor_count integer not null default 5 check (floor_count between 0 and 25),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (college_id, code)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete restrict,
  submitter_id uuid not null references public.profiles(id) on delete restrict,
  building_id uuid references public.buildings(id) on delete set null,
  building_label text,
  tracking_id text not null unique,
  title text not null,
  description text not null,
  category public.report_category not null,
  floor text,
  room text,
  section text,
  situation text not null default 'normal' check (situation in ('normal', 'medium', 'high', 'critical')),
  status public.report_status not null default 'submitted',
  upvote_count integer not null default 0,
  photo_paths text[] not null default '{}',
  assigned_to uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reports_upvote_count_nonnegative check (upvote_count >= 0),
  constraint reports_title_length check (char_length(title) between 3 and 160),
  constraint reports_description_length check (char_length(description) between 10 and 5000)
);

create table if not exists public.report_upvotes (
  report_id uuid not null references public.reports(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (report_id, user_id)
);

create table if not exists public.report_updates (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  status public.report_status,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  report_id uuid references public.reports(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete restrict,
  body text not null,
  created_at timestamptz not null default now(),
  constraint messages_body_length check (char_length(body) between 1 and 4000)
);

-- Indexes
create index if not exists reports_college_status_idx on public.reports (college_id, status);
create index if not exists reports_building_idx on public.reports (building_id);
create index if not exists reports_submitter_idx on public.reports (submitter_id);
create index if not exists reports_created_at_idx on public.reports (created_at desc);
create index if not exists report_upvotes_user_idx on public.report_upvotes (user_id);
create index if not exists report_updates_report_idx on public.report_updates (report_id, created_at);
create index if not exists messages_report_created_idx on public.messages (report_id, created_at);

-- =============================================================================
-- Triggers & Functions
-- =============================================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists colleges_set_updated_at on public.colleges;
create trigger colleges_set_updated_at before update on public.colleges for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();

drop trigger if exists buildings_set_updated_at on public.buildings;
create trigger buildings_set_updated_at before update on public.buildings for each row execute function public.set_updated_at();

drop trigger if exists reports_set_updated_at on public.reports;
create trigger reports_set_updated_at before update on public.reports for each row execute function public.set_updated_at();

-- handle_new_user: validates college, email domain, creates profile
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  campus_id uuid;
  campus_email_domain text;
  requested_college_id uuid;
  requested_role public.user_role := 'student';
begin
  begin
    requested_college_id := nullif(new.raw_user_meta_data ->> 'college_id', '')::uuid;
  exception when invalid_text_representation then
    raise exception 'Select a valid college before signing up';
  end;

  select id, email_domain into campus_id, campus_email_domain
  from public.colleges where id = requested_college_id and is_active limit 1;

  if campus_id is null then
    raise exception 'Select an active college before signing up';
  end if;

  if campus_email_domain is not null and not exists (
    select 1
    from unnest(string_to_array(lower(regexp_replace(trim(campus_email_domain), '^@', '')), ',')) as allowed_domain(domain)
    where lower(split_part(new.email, '@', 2)) = trim(allowed_domain.domain)
  ) then
    raise exception 'Use an email address from your selected college domain';
  end if;

  if new.raw_user_meta_data ->> 'role' = 'admin' then
    requested_role := 'admin';
  end if;

  insert into public.profiles (id, college_id, role, approval_status, approval_requested_role, email, full_name)
  values (
    new.id, campus_id, 'student'::public.user_role, 'pending', requested_role,
    new.email, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update
  set email = excluded.email, full_name = coalesce(public.profiles.full_name, excluded.full_name);
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Upvote count sync
create or replace function public.sync_report_upvote_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.reports set upvote_count = upvote_count + 1 where id = new.report_id;
  elsif tg_op = 'DELETE' then
    update public.reports set upvote_count = greatest(upvote_count - 1, 0) where id = old.report_id;
  end if;
  return coalesce(new, old);
end; $$;

drop trigger if exists report_upvotes_sync_count on public.report_upvotes;
create trigger report_upvotes_sync_count after insert or delete on public.report_upvotes for each row execute function public.sync_report_upvote_count();

-- Prevent unauthorized report field changes
create or replace function public.prevent_unauthorized_report_updates()
returns trigger language plpgsql security definer set search_path = public as $$
declare caller_role public.user_role;
begin
  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role = 'student' and (
    old.status is distinct from new.status or old.assigned_to is distinct from new.assigned_to
    or old.resolved_at is distinct from new.resolved_at or old.upvote_count is distinct from new.upvote_count
    or old.college_id is distinct from new.college_id or old.submitter_id is distinct from new.submitter_id
  ) then raise exception 'Students cannot update protected report fields'; end if;
  if caller_role = 'admin' and old.college_id is distinct from new.college_id then
    raise exception 'Admins cannot transfer reports between colleges';
  end if;
  if caller_role = 'admin' and old.college_id <> public.current_profile_college() then
    raise exception 'Admins cannot update reports outside their college';
  end if;
  return new;
end; $$;

drop trigger if exists prevent_unauthorized_report_updates on public.reports;
create trigger prevent_unauthorized_report_updates before update on public.reports for each row execute function public.prevent_unauthorized_report_updates();

-- =============================================================================
-- Row Level Security (RLS) helper functions
-- =============================================================================

create or replace function public.current_profile_college()
returns uuid language sql stable security definer set search_path = public as $$
  select college_id from public.profiles where id = auth.uid() and approval_status = 'approved';
$$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin' and approval_status = 'approved');
$$;

create or replace function public.is_college_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and approval_status = 'approved');
$$;

-- =============================================================================
-- RLS Policies
-- =============================================================================

alter table public.colleges enable row level security;
alter table public.profiles enable row level security;
alter table public.buildings enable row level security;
alter table public.reports enable row level security;
alter table public.report_upvotes enable row level security;
alter table public.report_updates enable row level security;
alter table public.messages enable row level security;

-- Colleges
drop policy if exists "Public read active colleges" on public.colleges;
create policy "Public read active colleges" on public.colleges for select using (is_active = true);

drop policy if exists "Users read their college" on public.colleges;
create policy "Users read their college" on public.colleges for select using (public.is_super_admin() or id = public.current_profile_college());

drop policy if exists "Super admins manage colleges" on public.colleges;
create policy "Super admins manage colleges" on public.colleges for all using (public.is_super_admin()) with check (public.is_super_admin());

-- Profiles
drop policy if exists "Users read accessible profiles" on public.profiles;
create policy "Users read accessible profiles" on public.profiles for select using (
  id = auth.uid() or public.is_super_admin() or (public.is_college_admin() and college_id = public.current_profile_college())
);

drop policy if exists "Super admins manage profiles" on public.profiles;
create policy "Super admins manage profiles" on public.profiles for all using (public.is_super_admin()) with check (public.is_super_admin());

-- Buildings
drop policy if exists "Users read college buildings" on public.buildings;
create policy "Users read college buildings" on public.buildings for select using (public.is_super_admin() or college_id = public.current_profile_college());

drop policy if exists "College admins manage buildings" on public.buildings;
create policy "College admins manage buildings" on public.buildings for all
  using (public.is_super_admin() or (public.is_college_admin() and college_id = public.current_profile_college()))
  with check (public.is_super_admin() or (public.is_college_admin() and college_id = public.current_profile_college()));

-- Reports
drop policy if exists "Users read college reports" on public.reports;
create policy "Users read college reports" on public.reports for select using (
  public.is_super_admin() or (college_id = public.current_profile_college() and (submitter_id = auth.uid() or public.is_college_admin()))
);

drop policy if exists "Students create reports" on public.reports;
create policy "Students create reports" on public.reports for insert with check (
  auth.uid() is not null and submitter_id = auth.uid() and college_id = public.current_profile_college()
);

drop policy if exists "Admins manage college reports" on public.reports;
create policy "Admins manage college reports" on public.reports for all
  using (public.is_super_admin() or (public.is_college_admin() and college_id = public.current_profile_college()))
  with check (public.is_super_admin() or (public.is_college_admin() and college_id = public.current_profile_college()));

-- Report upvotes
drop policy if exists "Users read report upvotes" on public.report_upvotes;
create policy "Users read report upvotes" on public.report_upvotes for select using (
  exists (select 1 from public.reports r where r.id = report_upvotes.report_id and (public.is_super_admin() or r.college_id = public.current_profile_college()))
);

drop policy if exists "Students manage own upvotes" on public.report_upvotes;
create policy "Students manage own upvotes" on public.report_upvotes for all
  using (user_id = auth.uid() and exists (select 1 from public.reports r where r.id = report_upvotes.report_id and r.college_id = public.current_profile_college()))
  with check (user_id = auth.uid() and exists (select 1 from public.reports r where r.id = report_upvotes.report_id and r.college_id = public.current_profile_college()));

-- Report updates
drop policy if exists "Users read college report updates" on public.report_updates;
create policy "Users read college report updates" on public.report_updates for select using (
  exists (select 1 from public.reports r where r.id = report_updates.report_id and (
    public.is_super_admin() or (r.college_id = public.current_profile_college() and (r.submitter_id = auth.uid() or public.is_college_admin()))
  ))
);

drop policy if exists "Admins create report updates" on public.report_updates;
create policy "Admins create report updates" on public.report_updates for insert with check (
  author_id = auth.uid() and exists (select 1 from public.reports r where r.id = report_updates.report_id and (
    public.is_super_admin() or (public.is_college_admin() and r.college_id = public.current_profile_college())
  ))
);

-- Messages
drop policy if exists "Users read college messages" on public.messages;
create policy "Users read college messages" on public.messages for select using (
  public.is_super_admin() or (college_id = public.current_profile_college() and (
    public.is_college_admin() or sender_id = auth.uid() or exists (select 1 from public.reports r where r.id = messages.report_id and r.submitter_id = auth.uid())
  ))
);

drop policy if exists "Users create messages" on public.messages;
create policy "Users create messages" on public.messages for insert with check (
  sender_id = auth.uid() and (
    public.is_super_admin() or (college_id = public.current_profile_college() and (
      public.is_college_admin() or exists (select 1 from public.reports r where r.id = messages.report_id and r.submitter_id = auth.uid() and r.college_id = public.current_profile_college())
    ))
  ) and (report_id is null or exists (select 1 from public.reports r where r.id = messages.report_id and r.college_id = messages.college_id))
);

-- =============================================================================
-- Storage bucket for report photos
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-photos', 'report-photos', false, 5242880, array['image/jpeg','image/png','image/webp','image/heic','image/heif']::text[])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Report photos are readable by report participants" on storage.objects;
create policy "Report photos are readable by report participants" on storage.objects for select using (
  bucket_id = 'report-photos' and auth.uid() is not null and exists (
    select 1 from public.reports r
    where r.id::text = split_part(storage.objects.name, '/', 2)
      and r.college_id::text = split_part(storage.objects.name, '/', 1)
      and (public.is_super_admin() or (r.college_id = public.current_profile_college() and (r.submitter_id = auth.uid() or public.is_college_admin())))
  )
);

drop policy if exists "Users upload report photos" on storage.objects;
create policy "Users upload report photos" on storage.objects for insert with check (
  bucket_id = 'report-photos' and auth.uid() is not null
  and split_part(storage.objects.name, '/', 3) = auth.uid()::text
  and exists (
    select 1 from public.reports r
    where r.id::text = split_part(storage.objects.name, '/', 2)
      and r.college_id::text = split_part(storage.objects.name, '/', 1)
      and (public.is_super_admin() or (r.college_id = public.current_profile_college() and (r.submitter_id = auth.uid() or public.is_college_admin())))
  )
);

drop policy if exists "Owners update report photos" on storage.objects;
create policy "Owners update report photos" on storage.objects for update
  using (bucket_id = 'report-photos' and owner_id = auth.uid()::text)
  with check (bucket_id = 'report-photos' and owner_id = auth.uid()::text);

drop policy if exists "Owners delete report photos" on storage.objects;
create policy "Owners delete report photos" on storage.objects for delete
  using (bucket_id = 'report-photos' and owner_id = auth.uid()::text);

-- =============================================================================
-- Seed data: colleges + buildings
-- =============================================================================

insert into public.colleges (name, slug, address, email_domain)
values ('KCC Institute', 'kcc', 'KCC Institute Campus', 'gmail.com')
on conflict (slug) do update
set name = excluded.name, address = excluded.address, email_domain = excluded.email_domain, is_active = true;

insert into public.colleges (name, slug, address, email_domain)
values ('G. L. Bajaj Institute of Technology & Management', 'glbitm', 'Plot No. 2, APJ Abdul Kalam Road, Knowledge Park III, Greater Noida, Uttar Pradesh 201306', 'glbitm.ac.in,glbitm.org')
on conflict (slug) do update
set name = excluded.name, address = excluded.address, email_domain = excluded.email_domain, is_active = true;

insert into public.buildings (college_id, name, code)
select kcc.id, block.name, block.code
from public.colleges kcc
cross join (values ('KCC Block A', 'KCC-A'), ('KCC Block B', 'KCC-B'), ('KCC Block C', 'KCC-C')) as block(name, code)
where kcc.slug = 'kcc'
on conflict (college_id, code) do update set name = excluded.name, is_active = true;

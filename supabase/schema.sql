create extension if not exists "pgcrypto";

do $$
begin
  create type public.user_role as enum ('student', 'admin', 'super_admin');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.report_status as enum (
    'submitted',
    'under_review',
    'assigned',
    'in_progress',
    'resolved',
    'rejected',
    'closed'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.report_category as enum (
    'electrical',
    'plumbing',
    'cleanliness',
    'internet',
    'furniture',
    'safety',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

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

create index if not exists reports_college_status_idx
  on public.reports (college_id, status);
create index if not exists reports_building_idx
  on public.reports (building_id);
create index if not exists reports_submitter_idx
  on public.reports (submitter_id);
create index if not exists reports_created_at_idx
  on public.reports (created_at desc);
create index if not exists report_upvotes_user_idx
  on public.report_upvotes (user_id);
create index if not exists report_updates_report_idx
  on public.report_updates (report_id, created_at);
create index if not exists messages_report_created_idx
  on public.messages (report_id, created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists colleges_set_updated_at on public.colleges;
create trigger colleges_set_updated_at
before update on public.colleges
for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists buildings_set_updated_at on public.buildings;
create trigger buildings_set_updated_at
before update on public.buildings
for each row execute function public.set_updated_at();

drop trigger if exists reports_set_updated_at on public.reports;
create trigger reports_set_updated_at
before update on public.reports
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

  select id, email_domain
  into campus_id, campus_email_domain
  from public.colleges
  where id = requested_college_id and is_active
  limit 1;

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
  else
    requested_role := 'student';
  end if;

  insert into public.profiles (
    id, college_id, role, approval_status, approval_requested_role, email, full_name, approved_at
  )
  values (
    new.id,
    campus_id,
    'student'::public.user_role,
    case when requested_role = 'student' then 'approved' else 'pending' end,
    requested_role,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    case when requested_role = 'student' then now() else null end
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

create or replace function public.sync_report_upvote_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.reports
    set upvote_count = upvote_count + 1
    where id = new.report_id;
  elsif tg_op = 'DELETE' then
    update public.reports
    set upvote_count = greatest(upvote_count - 1, 0)
    where id = old.report_id;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists report_upvotes_sync_count on public.report_upvotes;
create trigger report_upvotes_sync_count
after insert or delete on public.report_upvotes
for each row execute function public.sync_report_upvote_count();

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
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_unauthorized_report_updates on public.reports;
create trigger prevent_unauthorized_report_updates
before update on public.reports
for each row execute function public.prevent_unauthorized_report_updates();

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
    'submitted', 'under_review', 'assigned', 'in_progress',
    'resolved', 'rejected', 'closed'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.report_category as enum (
    'electrical', 'plumbing', 'cleanliness', 'internet',
    'furniture', 'safety', 'other'
  );
exception
  when duplicate_object then null;
end $$;

drop table if exists public.chat_message cascade;
drop table if exists public.messages cascade;

create table if not exists public.colleges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
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
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_college_for_member check (
    role = 'super_admin' or college_id is not null
  )
);

create table if not exists public.buildings (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  name text not null,
  code text,
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
  tracking_id text not null unique,
  title text not null,
  description text not null,
  category public.report_category not null,
  floor text,
  room text,
  status public.report_status not null default 'submitted',
  upvote_count integer not null default 0,
  photo_paths text[] not null default '{}',
  assigned_to uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reports_upvote_count_nonnegative check (upvote_count >= 0)
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

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  report_id uuid references public.reports(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete restrict,
  body text not null,
  created_at timestamptz not null default now(),
  constraint messages_body_length check (char_length(body) between 1 and 4000)
);

create index if not exists reports_college_status_idx on public.reports (college_id, status);
create index if not exists reports_building_idx on public.reports (building_id);
create index if not exists reports_submitter_idx on public.reports (submitter_id);
create index if not exists reports_created_at_idx on public.reports (created_at desc);
create index if not exists report_upvotes_user_idx on public.report_upvotes (user_id);
create index if not exists report_updates_report_idx on public.report_updates (report_id, created_at);
create index if not exists messages_report_created_idx on public.messages (report_id, created_at);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists colleges_set_updated_at on public.colleges;
create trigger colleges_set_updated_at before update on public.colleges
for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists buildings_set_updated_at on public.buildings;
create trigger buildings_set_updated_at before update on public.buildings
for each row execute function public.set_updated_at();

drop trigger if exists reports_set_updated_at on public.reports;
create trigger reports_set_updated_at before update on public.reports
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
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
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.sync_report_upvote_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.reports set upvote_count = upvote_count + 1 where id = new.report_id;
  elsif tg_op = 'DELETE' then
    update public.reports set upvote_count = greatest(upvote_count - 1, 0) where id = old.report_id;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists report_upvotes_sync_count on public.report_upvotes;
create trigger report_upvotes_sync_count after insert or delete on public.report_upvotes
for each row execute function public.sync_report_upvote_count();

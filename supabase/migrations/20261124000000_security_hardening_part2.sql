-- =============================================================================
-- CampusFix PART 2 Security Hardening Migration
-- =============================================================================

-- 1. Ensure Row Level Security is enabled on every public table
alter table public.colleges enable row level security;
alter table public.profiles enable row level security;
alter table public.buildings enable row level security;
alter table public.reports enable row level security;
alter table public.report_upvotes enable row level security;
alter table public.report_updates enable row level security;
alter table public.messages enable row level security;

-- 2. Normalize usernames to lowercase and enforce unique lower(username) index
update public.profiles
set username = lower(trim(username))
where username is not null
  and username <> lower(trim(username));

create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username)) where username is not null;

create or replace function public.normalize_profile_username()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.username is not null then
    new.username := nullif(lower(trim(new.username)), '');
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_normalize_username on public.profiles;
create trigger profiles_normalize_username
before insert or update on public.profiles
for each row execute function public.normalize_profile_username();

-- 3. Prevent unauthorized updates to protected profile columns
revoke update (
  role,
  approval_status,
  approval_requested_role,
  approved_by,
  approved_at,
  college_id
) on public.profiles from authenticated, anon;

create or replace function public.prevent_unauthorized_profile_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role'
     and auth.uid() is not null
     and (
       old.role is distinct from new.role
       or old.approval_status is distinct from new.approval_status
       or old.approval_requested_role is distinct from new.approval_requested_role
       or old.approved_by is distinct from new.approved_by
       or old.approved_at is distinct from new.approved_at
       or old.college_id is distinct from new.college_id
     )
  then
    if not public.is_super_admin() then
      raise exception 'Unauthorized update to protected profile fields';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_unauthorized_profile_updates on public.profiles;
create trigger prevent_unauthorized_profile_updates
before update on public.profiles
for each row execute function public.prevent_unauthorized_profile_updates();

-- 4. Performance & tenant-scoped pagination indexes
create index if not exists reports_college_created_at_idx
  on public.reports (college_id, created_at desc);

create index if not exists messages_college_created_at_idx
  on public.messages (college_id, created_at desc);

-- 5. Harden handle_new_user email domain trimming per comma-separated item
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

  if campus_email_domain is not null and length(trim(campus_email_domain)) > 0 and not exists (
    select 1
    from unnest(string_to_array(lower(campus_email_domain), ',')) as allowed_domain(domain)
    where lower(split_part(new.email, '@', 2)) = regexp_replace(trim(allowed_domain.domain), '^@', '')
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
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    case when requested_role = 'student' then now() else null end
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(public.profiles.full_name, excluded.full_name);

  return new;
end;
$$;

-- 6. Tighten report-photos storage bucket so uploads only enter via sanitized /api/uploads
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-photos', 'report-photos', false, 5242880, array['image/jpeg','image/png','image/webp']::text[])
on conflict (id) do update
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg','image/png','image/webp']::text[];

drop policy if exists "Users upload report photos" on storage.objects;
drop policy if exists "Owners update report photos" on storage.objects;
drop policy if exists "Owners delete report photos" on storage.objects;

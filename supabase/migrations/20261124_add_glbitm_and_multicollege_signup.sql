-- Add GL Bajaj as a separate tenant and let registration select any active tenant.
-- Reuse the empty legacy GL Bajaj row, when present, to avoid duplicate tenants.
update public.colleges
set name = 'G. L. Bajaj Institute of Technology & Management',
    slug = 'glbitm',
    address = 'Plot No. 2, APJ Abdul Kalam Road, Knowledge Park III, Greater Noida, Uttar Pradesh 201306',
    email_domain = 'glbitm.ac.in,glbitm.org',
    is_active = true
where slug = 'glbajaj'
  and not exists (select 1 from public.colleges where slug = 'glbitm');

insert into public.colleges (name, slug, address, email_domain, is_active)
values (
  'G. L. Bajaj Institute of Technology & Management',
  'glbitm',
  'Plot No. 2, APJ Abdul Kalam Road, Knowledge Park III, Greater Noida, Uttar Pradesh 201306',
  'glbitm.ac.in,glbitm.org',
  true
)
on conflict (slug) do update
set name = excluded.name,
    address = excluded.address,
    email_domain = excluded.email_domain,
    is_active = true;

drop policy if exists "Public read KCC Institute" on public.colleges;
drop policy if exists "Public read active colleges" on public.colleges;
create policy "Public read active colleges"
on public.colleges for select
using (is_active = true);

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
  end if;

  insert into public.profiles (
    id, college_id, role, approval_status, approval_requested_role, email, full_name
  )
  values (
    new.id,
    campus_id,
    'student',
    'pending',
    requested_role,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update
  set college_id = excluded.college_id,
      email = excluded.email,
      full_name = coalesce(public.profiles.full_name, excluded.full_name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Permit super-admin chat while keeping every message inside its selected campus.
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

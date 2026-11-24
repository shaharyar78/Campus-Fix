create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  campus_id uuid;
  campus_email_domain text;
  allowed_domains text[];
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

  if new.raw_user_meta_data ->> 'role' = 'admin' then
    requested_role := 'admin';
  end if;

  select array_agg(lower(regexp_replace(trim(configured.domain_name), '^@', '')))
  into allowed_domains
  from unnest(string_to_array(coalesce(campus_email_domain, ''), ',')) as configured(domain_name)
  where nullif(regexp_replace(trim(configured.domain_name), '^@', ''), '') is not null;

  if requested_role = 'student' and coalesce(cardinality(allowed_domains), 0) = 0 then
    raise exception 'This college is not accepting registrations yet.';
  end if;

  if coalesce(cardinality(allowed_domains), 0) > 0
    and not (lower(split_part(coalesce(new.email, ''), '@', 2)) = any(allowed_domains)) then
    raise exception 'Use an email address from your selected college domain';
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

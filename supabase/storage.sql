insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'report-photos',
  'report-photos',
  false,
  5242880,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ]::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Report photos are readable by report participants" on storage.objects;
create policy "Report photos are readable by report participants"
on storage.objects for select
using (
  bucket_id = 'report-photos'
  and auth.uid() is not null
  and exists (
    select 1
    from public.reports r
    where r.id::text = split_part(storage.objects.name, '/', 2)
      and r.college_id::text = split_part(storage.objects.name, '/', 1)
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

drop policy if exists "Users upload report photos" on storage.objects;
create policy "Users upload report photos"
on storage.objects for insert
with check (
  bucket_id = 'report-photos'
  and auth.uid() is not null
  and split_part(storage.objects.name, '/', 3) = auth.uid()::text
  and exists (
    select 1
    from public.reports r
    where r.id::text = split_part(storage.objects.name, '/', 2)
      and r.college_id::text = split_part(storage.objects.name, '/', 1)
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

drop policy if exists "Owners update report photos" on storage.objects;
create policy "Owners update report photos"
on storage.objects for update
using (
  bucket_id = 'report-photos'
  and owner_id = auth.uid()::text
)
with check (
  bucket_id = 'report-photos'
  and owner_id = auth.uid()::text
);

drop policy if exists "Owners delete report photos" on storage.objects;
create policy "Owners delete report photos"
on storage.objects for delete
using (
  bucket_id = 'report-photos'
  and owner_id = auth.uid()::text
);
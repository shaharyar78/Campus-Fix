-- Upvote support for CampusFix reports

alter table public.reports
  add column if not exists upvote_count integer not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reports_upvote_count_nonnegative'
      and conrelid = 'public.reports'::regclass
  ) then
    alter table public.reports
      add constraint reports_upvote_count_nonnegative
      check (upvote_count >= 0);
  end if;
end $$;

create table if not exists public.report_upvotes (
  report_id uuid not null references public.reports(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (report_id, user_id)
);

create index if not exists report_upvotes_user_idx
  on public.report_upvotes (user_id);

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

update public.reports r
set upvote_count = (
  select count(*)
  from public.report_upvotes u
  where u.report_id = r.id
);
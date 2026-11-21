alter table public.reports
  add column if not exists building_label text,
  add column if not exists section text,
  add column if not exists situation text not null default 'normal';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reports_situation_valid'
      and conrelid = 'public.reports'::regclass
  ) then
    alter table public.reports
      add constraint reports_situation_valid
      check (situation in ('normal', 'medium', 'high', 'critical'));
  end if;
end $$;

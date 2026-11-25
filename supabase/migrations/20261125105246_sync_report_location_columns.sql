-- Align the hosted reports table with the report form and API schema.
alter table public.reports
  add column if not exists building_label text,
  add column if not exists section text,
  add column if not exists situation text;

update public.reports
set situation = 'normal'
where situation is null;

alter table public.reports
  alter column situation set default 'normal',
  alter column situation set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.reports'::regclass
      and conname = 'reports_situation_check'
  ) then
    alter table public.reports
      add constraint reports_situation_check
      check (situation in ('normal', 'medium', 'high', 'critical'));
  end if;
end;
$$;

notify pgrst, 'reload schema';

alter table public.buildings
  add column if not exists floor_count integer not null default 5
  check (floor_count between 0 and 25);

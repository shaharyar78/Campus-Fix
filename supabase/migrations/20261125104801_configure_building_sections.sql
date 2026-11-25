-- Store per-building section choices so admins control the report form options.
alter table public.buildings
  add column if not exists sections text[] not null default '{}'::text[];

-- KCC currently uses sections A1-A10 and B1-B10. Do not expose C sections by default.
update public.buildings b
set sections = array(
  select format('%s%s', chr(65 + blocks.block_number), floors.floor_number)
  from generate_series(0, 1) as blocks(block_number)
  cross join generate_series(1, 10) as floors(floor_number)
  order by blocks.block_number, floors.floor_number
)
from public.colleges c
where c.id = b.college_id
  and c.slug = 'kcc';

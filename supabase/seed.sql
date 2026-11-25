-- Campus tenants. Building records are seeded only where campus locations are confirmed.
insert into public.colleges (name, slug, address, email_domain)
values ('KCC Institute', 'kcc', 'KCC Institute Campus', 'gmail.com')
on conflict (slug) do update
set name = excluded.name,
    address = excluded.address,
    email_domain = excluded.email_domain,
    is_active = true;

insert into public.colleges (name, slug, address, email_domain)
values (
  'G. L. Bajaj Institute of Technology & Management',
  'glbitm',
  'Plot No. 2, APJ Abdul Kalam Road, Knowledge Park III, Greater Noida, Uttar Pradesh 201306',
  'glbitm.ac.in,glbitm.org'
)
on conflict (slug) do update
set name = excluded.name,
    address = excluded.address,
    email_domain = excluded.email_domain,
    is_active = true;

insert into public.buildings (college_id, name, code)
select kcc.id, block.name, block.code
from public.colleges kcc
cross join (values
  ('KCC Block A', 'KCC-A'),
  ('KCC Block B', 'KCC-B'),
  ('KCC Block C', 'KCC-C')
) as block(name, code)
where kcc.slug = 'kcc'
on conflict (college_id, code) do update
set name = excluded.name,
    is_active = true;

update public.buildings b
set sections = array(
  select format('%s%s', chr(65 + block_number), floor_number)
  from generate_series(0, 1) as blocks(block_number)
  cross join generate_series(1, 10) as floors(floor_number)
  order by block_number, floor_number
)
from public.colleges c
where c.id = b.college_id
  and c.slug = 'kcc';

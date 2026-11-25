-- Keep a report status change and its timeline entry in the same transaction.
create or replace function public.append_report_update(
  p_report_id uuid,
  p_status public.report_status,
  p_message text
)
returns public.report_updates
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_update public.report_updates;
  v_updated_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_message is null or char_length(btrim(p_message)) not between 1 and 4000 then
    raise exception 'Update message must be between 1 and 4000 characters' using errcode = '22023';
  end if;

  if p_status is not null then
    update public.reports
       set status = p_status,
           updated_at = now(),
           resolved_at = case
             when p_status = 'resolved' then now()
             when p_status = 'closed' then resolved_at
             else null
           end
     where id = p_report_id;
    get diagnostics v_updated_count = row_count;
    if v_updated_count = 0 then
      raise exception 'Report not found or not available to this account' using errcode = 'P0002';
    end if;
  elsif not exists (select 1 from public.reports where id = p_report_id) then
    raise exception 'Report not found or not available to this account' using errcode = 'P0002';
  end if;

  insert into public.report_updates (report_id, author_id, status, message)
  values (p_report_id, auth.uid(), p_status, btrim(p_message))
  returning * into v_update;
  return v_update;
end;
$$;

revoke all on function public.append_report_update(uuid, public.report_status, text) from public, anon;
grant execute on function public.append_report_update(uuid, public.report_status, text) to authenticated;

begin;
create function public.apex_bulk_update_tasks(p_items jsonb, p_patch jsonb)
returns setof public.apex_tasks language plpgsql security invoker set search_path=public as $$
declare item jsonb; locked integer:=0; t public.apex_tasks;
begin
  if not public.apex_is_staff() then raise exception 'Yetkiniz yok'; end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 50 then raise exception 'En fazla 50 iş seçin'; end if;
  if p_patch is null or jsonb_typeof(p_patch)<>'object' or p_patch='{}'::jsonb then raise exception 'Değiştirilecek alan seçin'; end if;
  if exists(select 1 from jsonb_object_keys(p_patch) k where k not in ('assignee_id','due_date')) then raise exception 'Geçersiz alan'; end if;
  if exists(select 1 from jsonb_array_elements(p_items) x where jsonb_typeof(x)<>'object' or x->>'id' is null or x->>'version' is null or (x->>'version') !~ '^[1-9][0-9]*$') then raise exception 'Geçersiz iş'; end if;
  if (select count(distinct (x->>'id')::uuid) from jsonb_array_elements(p_items) x)<>jsonb_array_length(p_items) then raise exception 'İşler tekrarlanamaz'; end if;
  if p_patch->>'assignee_id' is not null and not exists(select 1 from public.apex_members where id=(p_patch->>'assignee_id')::uuid and active and role in ('partner','staff')) then raise exception 'Sorumlu olarak bir ekip üyesi seçin'; end if;
  if p_patch->>'due_date' is not null then
    if p_patch->>'due_date' !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Geçersiz tarih'; end if;
    perform (p_patch->>'due_date')::date;
  end if;
  -- Lock in a stable order and check every version before applying any change.
  for t in select * from public.apex_tasks where id in (select (x->>'id')::uuid from jsonb_array_elements(p_items) x) order by id for update loop
    select x into item from jsonb_array_elements(p_items) x where (x->>'id')::uuid=t.id;
    if t.version<>(item->>'version')::integer then raise exception 'CONFLICT'; end if;
    locked:=locked+1;
  end loop;
  if locked<>jsonb_array_length(p_items) then raise exception 'CONFLICT'; end if;
  for item in select x from jsonb_array_elements(p_items) x order by x->>'id' loop
    return next public.apex_update_task((item->>'id')::uuid,(item->>'version')::integer,p_patch);
  end loop;
end $$;
revoke all on function public.apex_bulk_update_tasks(jsonb,jsonb) from public,anon;
grant execute on function public.apex_bulk_update_tasks(jsonb,jsonb) to authenticated;
commit;

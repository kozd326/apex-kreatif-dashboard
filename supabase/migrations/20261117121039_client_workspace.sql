-- Public customer information is opt-in; existing records remain private.
alter table public.apex_customers add column portal_note text not null default '', add column portal_folder_url text not null default '';
alter table public.apex_tasks add column shared boolean not null default false, add column customer_note text not null default '', add column archived boolean not null default false;
alter table public.apex_events add column shared boolean not null default false;
alter table public.apex_tasks add constraint apex_tasks_shared_customer check (not shared or customer_id is not null);
alter table public.apex_events add constraint apex_events_shared_customer check (not shared or customer_id is not null);
alter table public.apex_customers add constraint apex_customer_portal_note_length check (length(portal_note)<=4000);
alter table public.apex_tasks add constraint apex_task_customer_note_length check (length(customer_note)<=4000);
create or replace function public.apex_can_view_customer(cid uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from apex_client_access a join apex_members m on m.id=a.user_id join apex_customers c on c.id=a.customer_id where a.user_id=auth.uid() and a.customer_id=cid and m.active and not c.archived);
$$;
create or replace function public.apex_update_task(p_id uuid,p_version integer,p_patch jsonb) returns public.apex_tasks language plpgsql security invoker set search_path=public as $$
declare result apex_tasks;
begin
 if not apex_is_staff() then raise exception 'Yetkiniz yok'; end if;
 update apex_tasks set
 archived=case when p_patch?'archived' then (p_patch->>'archived')::boolean else archived end,
 shared=case when p_patch?'shared' then (p_patch->>'shared')::boolean else shared end,
 customer_note=case when p_patch?'customer_note' then p_patch->>'customer_note' else customer_note end,
 customer_id=case when p_patch?'customer_id' then (p_patch->>'customer_id')::uuid else customer_id end,
 project_id=case when p_patch?'project_id' then (p_patch->>'project_id')::uuid else project_id end,
 predecessor_id=case when p_patch?'predecessor_id' then (p_patch->>'predecessor_id')::uuid else predecessor_id end,
 title=case when p_patch?'title' then p_patch->>'title' else title end,
 assignee_id=case when p_patch?'assignee_id' then (p_patch->>'assignee_id')::uuid else assignee_id end,
 reviewer_id=case when p_patch?'reviewer_id' then (p_patch->>'reviewer_id')::uuid else reviewer_id end,
 due_date=case when p_patch?'due_date' then (p_patch->>'due_date')::date else due_date end,
 status=case when p_patch?'status' then p_patch->>'status' else status end,
 description=case when p_patch?'description' then p_patch->>'description' else description end,
 waiting_reason=case when p_patch?'waiting_reason' then p_patch->>'waiting_reason' else waiting_reason end,
 follow_up=case when p_patch?'follow_up' then (p_patch->>'follow_up')::date else follow_up end,
 follow_up_owner=case when p_patch?'follow_up_owner' then (p_patch->>'follow_up_owner')::uuid else follow_up_owner end,
 kind=case when p_patch?'kind' then p_patch->>'kind' else kind end,
 scope_decision=case when p_patch?'scope_decision' then p_patch->>'scope_decision' else scope_decision end,
 checklist=case when p_patch?'checklist' then p_patch->'checklist' else checklist end,
 links=case when p_patch?'links' then p_patch->'links' else links end,
 completed_at=case when p_patch->>'status'='Tamamlandı' then coalesce(completed_at,now()) when p_patch?'status' then null else completed_at end
 where id=p_id and version=p_version returning * into result;
 if not found then raise exception 'CONFLICT'; end if;
 return result;
end $$;
revoke all on function public.apex_update_task(uuid,integer,jsonb) from public;
grant execute on function public.apex_update_task(uuid,integer,jsonb) to authenticated;


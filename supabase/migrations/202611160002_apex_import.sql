begin;
-- Preserve exact source rows before the one-time conversion. Only service-role can read snapshots.
create table public.apex_legacy_snapshot(source text primary key, captured_at timestamptz default now(), rows jsonb not null);
alter table public.apex_legacy_snapshot enable row level security;
grant select on public.apex_legacy_snapshot to service_role;
do $$ declare t record; begin
 for t in select tablename from pg_tables where schemaname='public' and tablename not like 'apex_%' loop
 execute format('insert into apex_legacy_snapshot(source,rows) select %L,coalesce(jsonb_agg(to_jsonb(t)),''[]''::jsonb) from public.%I t',t.tablename,t.tablename);
 end loop;
end $$;
insert into apex_customers(id,name,contact_name,phone,email,notes,stage,created_at)
 select id,company_name,coalesce(contact_name,''),coalesce(contact_phone,''),coalesce(contact_email,''),coalesce(notes,''),'Anlaşıldı',created_at from client_brands;
insert into apex_legacy_map select 'client_brands',id,id from client_brands;
-- Existing projects without a matching brand get one manual customer profile.
insert into apex_customers(id,name,stage,notes,created_at)
 select p.id,coalesce(nullif(p.client_name,''),'Eski müşteri'),'Anlaşıldı',coalesce(p.client_notes,''),p.created_at from projects p
 where not exists(select 1 from client_brands b where b.project_id=p.id);
insert into apex_projects(id,customer_id,name,brief,service,owner_id,deadline,status,created_at)
 select p.id,coalesce((select b.id from client_brands b where b.project_id=p.id limit 1),p.id),p.project_name,concat_ws(E'\n',p.client_notes,p.files_or_links,p.delivery_notes),coalesce(p.service_type,'Diğer'),p.assigned_to,p.deadline,
 case when p.archived_at is not null then 'Arşiv' when p.status::text in ('Tamamlandı','Teslim Edildi') then 'Tamamlandı' else 'Aktif' end,p.created_at from projects p;
insert into apex_legacy_map select 'projects',id,id from projects;
insert into apex_tasks(id,project_id,customer_id,title,assignee_id,created_by,due_date,status,created_at)
 select t.id,t.project_id,p.customer_id,t.title,t.assigned_to,t.created_by,(t.due_date at time zone 'Europe/Istanbul')::date,
 case when t.status in ('Tamamlandı','Yapılıyor','Kontrolde') then t.status else 'Yapılacak' end,t.created_at from tasks t left join apex_projects p on p.id=t.project_id;
insert into apex_legacy_map select 'tasks',id,id from tasks;
-- Legacy payment plans have no tax details. They must never turn into fabricated invoices.
insert into apex_expected_payments(id,project_id,customer_id,title,amount,due_date,settled_amount,created_at)
 select p.id,p.project_id,pr.customer_id,p.title,greatest(p.amount,0),p.due_date,greatest(coalesce(p.paid_amount,case when p.status::text='Ödendi' then p.amount else 0 end),0),p.created_at from payments p left join apex_projects pr on pr.id=p.project_id;
insert into apex_legacy_map select 'payments',id,id from payments;
-- Historical cash is imported only when both amount and actual payment date are known.
insert into apex_cash(project_id,customer_id,direction,amount,entry_date,description,created_by)
 select p.project_id,pr.customer_id,'in',coalesce(p.paid_amount,p.amount),p.paid_at,'Eski kayıt: '||p.title,p.created_by from payments p left join apex_projects pr on pr.id=p.project_id where p.paid_at is not null and coalesce(p.paid_amount,p.amount)>0;
-- No legacy expense has a proven VAT breakdown: keep source in archive, require manual review.
-- Legacy privileged RPCs cannot be used by newly invited client accounts.
do $$ declare f record; begin
 for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.prosecdef and (p.proname like 'crm_%' or p.proname='reserve_agent_run')
 and p.proname not in ('crm_read_share','crm_share_feedback','crm_share_content_decision','crm_record_history','crm_can_write') loop
 execute format('revoke execute on function %s from public,authenticated,anon',f.sig);
 end loop;
end $$;
commit;

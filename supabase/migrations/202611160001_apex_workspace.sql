begin;
create table public.apex_members (
 id uuid primary key references auth.users(id), name text not null, email text not null,
 role text not null check(role in ('partner','staff','client')), active boolean not null default true
);
create function public.apex_is_staff() returns boolean language sql stable security definer set search_path = public as $$
 select exists(select 1 from apex_members where id=auth.uid() and active and role in ('partner','staff'));
$$;
create function public.apex_is_partner() returns boolean language sql stable security definer set search_path = public as $$
 select exists(select 1 from apex_members where id=auth.uid() and active and role='partner');
$$;
revoke all on function public.apex_is_staff() from public;
revoke all on function public.apex_is_partner() from public;
grant execute on function public.apex_is_staff(), public.apex_is_partner() to authenticated;

create table public.apex_customers (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name)>0), contact_name text not null default '', email text not null default '', phone text not null default '',
 stage text not null default 'Yeni' check(stage in ('Yeni','İletişime geçildi','Teklif verildi','Dönüş bekleniyor','Anlaşıldı','Olumsuz')),
 services text[] not null default '{}', owner_id uuid references apex_members(id), next_follow_up date, notes text not null default '', quote_amount numeric(14,2), ad_budget numeric(14,2) not null default 0, archived boolean default false,
 created_at timestamptz default now(), updated_at timestamptz default now(), version integer not null default 1
);
create table public.apex_client_access (
 user_id uuid references apex_members(id), customer_id uuid references apex_customers(id), primary key(user_id,customer_id)
);
create function public.apex_can_view_customer(cid uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from apex_client_access a join apex_members m on m.id=a.user_id where a.user_id=auth.uid() and a.customer_id=cid and m.active);
$$;
revoke all on function public.apex_can_view_customer(uuid) from public;
grant execute on function public.apex_can_view_customer(uuid) to authenticated;
create table public.apex_projects (
 id uuid primary key default gen_random_uuid(), customer_id uuid references apex_customers(id), name text not null, brief text not null default '', service text not null default 'Diğer',
 owner_id uuid references apex_members(id), deadline date, status text not null default 'Aktif' check(status in ('Aktif','Tamamlandı','Arşiv')), shared boolean default false,
 month date, created_at timestamptz default now(), updated_at timestamptz default now(), version integer not null default 1
);
create table public.apex_tasks (
 id uuid primary key default gen_random_uuid(), customer_id uuid references apex_customers(id), project_id uuid references apex_projects(id), title text not null check(length(title)>0),
 assignee_id uuid references apex_members(id), reviewer_id uuid references apex_members(id), created_by uuid references apex_members(id) default auth.uid(),
 due_date date, status text not null default 'Yapılacak' check(status in ('Yapılacak','Yapılıyor','Kontrolde','Tamamlandı')),
 description text not null default '', waiting_reason text not null default '', follow_up date, follow_up_owner uuid references apex_members(id),
 kind text not null default 'İş' check(kind in ('İş','Revizyon','Ek iş')), scope_decision text not null default '',
 checklist jsonb not null default '[]', links jsonb not null default '[]', predecessor_id uuid references apex_tasks(id),
 completed_at timestamptz, created_at timestamptz default now(), updated_at timestamptz default now(), version integer not null default 1
);
create table public.apex_comments (
 id uuid primary key default gen_random_uuid(), task_id uuid references apex_tasks(id), customer_id uuid references apex_customers(id),
 body text not null check(length(body) between 1 and 4000), mentions uuid[] not null default '{}', created_by uuid references apex_members(id) default auth.uid(), created_at timestamptz default now(),
 check(task_id is not null or customer_id is not null)
);
create table public.apex_deliverables (
 id uuid primary key default gen_random_uuid(), customer_id uuid not null references apex_customers(id), project_id uuid not null references apex_projects(id), title text not null,
 kind text not null default 'Tasarım', url text not null default '', revision integer not null default 1,
 status text not null default 'Hazırlanıyor' check(status in ('Hazırlanıyor','Onay bekliyor','Onaylandı','Revizyon istendi','Teslim edildi')),
 shared boolean not null default false, due_date date, delivered_at timestamptz,
 created_at timestamptz default now(), updated_at timestamptz default now(), version integer not null default 1
);
create table public.apex_reviews (
 id uuid primary key default gen_random_uuid(), deliverable_id uuid not null references apex_deliverables(id), revision integer not null,
 decision text not null check(decision in ('Onaylandı','Revizyon istendi','Yorum')), comment text not null default '',
 created_by uuid references apex_members(id) default auth.uid(), created_at timestamptz default now()
);
create table public.apex_entities (id uuid primary key default gen_random_uuid(), name text not null, tax_number text not null default '', notes text not null default '', created_at timestamptz default now());
create table public.apex_documents (
 id uuid primary key default gen_random_uuid(), name text not null, storage_path text not null unique, sha256 text not null unique, mime text not null,
 status text not null default 'Yüklendi' check(status in ('Yüklendi','Okunuyor','Kontrol bekliyor','Kaydedildi','Okunamadı')),
 extracted jsonb, error text, created_by uuid references apex_members(id) default auth.uid(), created_at timestamptz default now()
);
create table public.apex_invoices (
 id uuid primary key default gen_random_uuid(), direction text not null check(direction in ('sale','expense')), entity_id uuid references apex_entities(id),
 customer_id uuid references apex_customers(id), project_id uuid references apex_projects(id), document_id uuid references apex_documents(id),
 number text not null default '', counterparty text not null default '', category text not null default 'Diğer', description text not null default '',
 issue_date date not null, due_date date, net numeric(14,2) not null check(net>=0), vat numeric(14,2) not null default 0 check(vat>=0),
 total numeric(14,2) not null check(total>=0), lines jsonb not null default '[]', deductible boolean not null default false,
 tax_review boolean not null default true, tax_note text not null default '', refund boolean not null default false, shared boolean default false, void boolean default false,
 created_by uuid references apex_members(id) default auth.uid(), created_at timestamptz default now(), updated_at timestamptz default now(), version integer not null default 1,
 check(abs(total-net-vat)<0.01)
);
create unique index apex_invoice_number_unique on apex_invoices(coalesce(entity_id,'00000000-0000-0000-0000-000000000000'::uuid),direction,lower(btrim(counterparty)),lower(btrim(number))) where number<>'' and not void;
create unique index apex_invoice_document_unique on apex_invoices(document_id) where document_id is not null and not void;
create table public.apex_cash (
 id uuid primary key default gen_random_uuid(), customer_id uuid references apex_customers(id), project_id uuid references apex_projects(id), invoice_id uuid references apex_invoices(id),
 entity_id uuid references apex_entities(id), direction text not null check(direction in ('in','out')), amount numeric(14,2) not null check(amount>0),
 entry_date date not null, description text not null default '', method text not null default 'Banka', created_by uuid references apex_members(id) default auth.uid(), created_at timestamptz default now(), void boolean default false
);
create table public.apex_expected_payments (
 id uuid primary key default gen_random_uuid(), customer_id uuid references apex_customers(id), project_id uuid references apex_projects(id),
 title text not null, amount numeric(14,2) not null check(amount>=0), due_date date, invoice_id uuid references apex_invoices(id), settled_amount numeric(14,2) not null default 0, created_at timestamptz default now()
);
create table public.apex_packages (
 id uuid primary key default gen_random_uuid(), customer_id uuid references apex_customers(id), name text not null, kind text not null default 'service' check(kind in ('service','expense')),
 entity_id uuid references apex_entities(id), amount numeric(14,2) not null default 0, billing_day integer not null default 1 check(billing_day between 1 and 28),
 active boolean not null default true, start_month date not null, end_month date, tasks jsonb not null default '[]', quotas jsonb not null default '[]',
 created_at timestamptz default now(), updated_at timestamptz default now(), version integer not null default 1
);
create table public.apex_package_runs (package_id uuid references apex_packages(id), month date not null, project_id uuid references apex_projects(id), primary key(package_id,month));
create table public.apex_events (
 id uuid primary key default gen_random_uuid(), customer_id uuid references apex_customers(id), project_id uuid references apex_projects(id),
 title text not null, kind text not null check(kind in ('Çekim','Toplantı')), starts_at timestamptz not null, ends_at timestamptz not null,
 location text not null default '', cancelled boolean not null default false, attendees uuid[] not null default '{}', created_at timestamptz default now(), updated_at timestamptz default now(), version integer not null default 1,
 check(ends_at>starts_at)
);
create table public.apex_activity (
 id bigint generated always as identity primary key, actor_id uuid, entity_type text not null, entity_id uuid not null, action text not null, changes jsonb not null default '{}', created_at timestamptz default now()
);
create table public.apex_settings (key text primary key, value jsonb not null default '{}');
create table public.apex_calendar_jobs (
 key text primary key, google_id text, generation integer not null default 0, fingerprint text, status text not null default 'pending', error text, synced_at timestamptz
);
create table public.apex_legacy_map (source text not null, source_id uuid not null, target_id uuid not null, primary key(source,source_id));

-- Persist member roles independently of editable Auth metadata.
insert into apex_members(id,name,email,role,active)
 select u.id, coalesce(nullif(p.name,''),split_part(u.email,'@',1)),u.email,
 case when u.email in ('kozd326@gmail.com','kubika2282@gmail.com','muratcantokgoz.work@gmail.com') then 'partner' else 'staff' end, u.email in ('kozd326@gmail.com','kubika2282@gmail.com','muratcantokgoz.work@gmail.com')
 from auth.users u join public.profiles p on p.id=u.id;

create function public.apex_touch() returns trigger language plpgsql as $$
begin new.updated_at=now(); new.version=old.version+1; return new; end $$;
create function public.apex_audit() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into apex_activity(actor_id,entity_type,entity_id,action,changes) values(auth.uid(),TG_TABLE_NAME,new.id,TG_OP,
 case when TG_OP='UPDATE' then (select coalesce(jsonb_object_agg(n.key,jsonb_build_object('before',o.value,'after',n.value)),'{}') from jsonb_each(to_jsonb(new)) n join jsonb_each(to_jsonb(old)) o using(key) where n.value is distinct from o.value and n.key not in ('updated_at','version')) else jsonb_build_object('title',coalesce(to_jsonb(new)->>'title',to_jsonb(new)->>'name',to_jsonb(new)->>'description','Kayıt')) end);
 return new;
end $$;
revoke all on function public.apex_audit() from public;
do $$ declare t text; begin
 foreach t in array array['apex_customers','apex_projects','apex_tasks','apex_deliverables','apex_invoices','apex_packages','apex_events'] loop
 execute format('create trigger apex_touch before update on public.%I for each row execute function public.apex_touch()',t);
 execute format('create trigger apex_audit after insert or update on public.%I for each row execute function public.apex_audit()',t);
 end loop;
 foreach t in array array['apex_members','apex_customers','apex_client_access','apex_projects','apex_tasks','apex_comments','apex_deliverables','apex_reviews','apex_entities','apex_documents','apex_invoices','apex_cash','apex_expected_payments','apex_packages','apex_package_runs','apex_events','apex_activity','apex_settings','apex_calendar_jobs','apex_legacy_map'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 if t not in ('apex_members','apex_client_access','apex_activity','apex_settings','apex_calendar_jobs','apex_legacy_map') then
 execute format('create policy staff_read on public.%I for select to authenticated using(public.apex_is_staff())',t);
 execute format('create policy staff_insert on public.%I for insert to authenticated with check(public.apex_is_staff())',t);
 execute format('create policy staff_update on public.%I for update to authenticated using(public.apex_is_staff()) with check(public.apex_is_staff())',t);
 end if;
 end loop;
end $$;
create policy member_read on apex_members for select to authenticated using(public.apex_is_staff() or id=auth.uid());
create policy access_read on apex_client_access for select to authenticated using(public.apex_is_staff() or user_id=auth.uid());
create policy activity_read on apex_activity for select to authenticated using(public.apex_is_staff());
-- No client reads on internal tables: the server exposes a deliberately narrow projection.
-- Do not grant anonymous access to the new financial or customer records.

create function public.apex_update_task(p_id uuid,p_version integer,p_patch jsonb) returns public.apex_tasks language plpgsql security invoker set search_path=public as $$
declare result apex_tasks;
begin
 if not apex_is_staff() then raise exception 'Yetkiniz yok'; end if;
 update apex_tasks set
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

-- Monthly generation is atomic and idempotent, and creates expectations, never invoices/cash.
create function public.apex_generate_month(p_month date) returns integer language plpgsql security invoker set search_path=public as $$
declare p apex_packages; project uuid; task jsonb; item jsonb; prev uuid; tid uuid; count_runs integer:=0; claimed uuid;
begin
 if not apex_is_staff() and coalesce(auth.role(),'')<>'service_role' then raise exception 'Yetkiniz yok'; end if;
 p_month=date_trunc('month',p_month)::date;
 for p in select * from apex_packages where active and date_trunc('month',start_month)::date<=p_month and (end_month is null or date_trunc('month',end_month)::date>=p_month) loop
 claimed=null;
 insert into apex_package_runs(package_id,month) values(p.id,p_month) on conflict do nothing returning package_id into claimed;
 if claimed is null then continue; end if;
 project=null;
 if p.kind='service' then
 insert into apex_projects(customer_id,name,month,service) values(p.customer_id,p.name||' · '||to_char(p_month,'MM.YYYY'),p_month,p.name) returning id into project;
 update apex_package_runs set project_id=project where package_id=p.id and month=p_month;
 prev=null;
 for task in select * from jsonb_array_elements(p.tasks) loop
 insert into apex_tasks(customer_id,project_id,title,assignee_id,reviewer_id,due_date,predecessor_id)
 values(p.customer_id,project,task->>'title',(task->>'assignee_id')::uuid,(task->>'reviewer_id')::uuid,p_month+(coalesce((task->>'day')::integer,7)-1),case when coalesce((task->>'sequential')::boolean,false) then prev else null end) returning id into tid;
 prev=tid;
 end loop;
 for item in select * from jsonb_array_elements(p.quotas) loop
 for i in 1..least(coalesce((item->>'count')::integer,0),100) loop
 insert into apex_deliverables(customer_id,project_id,title,kind,due_date) values(p.customer_id,project,(item->>'kind')||' '||i,item->>'kind',(p_month+interval '1 month - 1 day')::date);
 end loop;
 end loop;
 insert into apex_expected_payments(customer_id,project_id,title,amount,due_date) values(p.customer_id,project,p.name,p.amount,p_month+p.billing_day-1);
 else
 insert into apex_tasks(title,due_date,description) values(p.name||' — gider kontrolü',p_month+p.billing_day-1,'Planlanan gider: '||p.amount||' TL. Fatura ve ödeme gerçekleştiğinde ayrıca kaydedin.');
 end if;
 count_runs=count_runs+1;
 end loop;
 return count_runs;
end $$;
revoke all on function public.apex_generate_month(date) from public;
grant execute on function public.apex_generate_month(date) to authenticated,service_role;

-- Members receive only their own realtime records through the policies above.
do $$ declare t text; begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
 foreach t in array array['apex_tasks','apex_comments','apex_customers','apex_projects','apex_deliverables','apex_cash','apex_invoices','apex_reviews'] loop
 execute format('alter publication supabase_realtime add table public.%I',t);
 end loop;
 end if;
end $$;

-- Reviews lock the exact submitted version. Clients cannot see or approve other customers' work.
create function public.apex_review(p_id uuid,p_revision integer,p_decision text,p_comment text) returns uuid language plpgsql security definer set search_path=public as $$
declare d apex_deliverables; rid uuid;
begin
 select * into d from apex_deliverables where id=p_id for update;
 if not found or not (apex_is_staff() or (d.shared and apex_can_view_customer(d.customer_id))) then raise exception 'Yetkiniz yok'; end if;
 if d.revision<>p_revision then raise exception 'CONFLICT'; end if;
 if p_decision not in ('Onaylandı','Revizyon istendi','Yorum') or length(p_comment)>4000 then raise exception 'Geçersiz yanıt'; end if;
 if p_decision<>'Yorum' and d.status not in ('Onay bekliyor','Revizyon istendi') then raise exception 'Bu sürüm onay beklemiyor'; end if;
 if p_decision='Revizyon istendi' and length(trim(p_comment))=0 then raise exception 'Revizyon notu gerekiyor'; end if;
 insert into apex_reviews(deliverable_id,revision,decision,comment) values(p_id,p_revision,p_decision,p_comment) returning id into rid;
 if p_decision<>'Yorum' then update apex_deliverables set status=p_decision where id=p_id; end if;
 return rid;
end $$;
revoke all on function public.apex_review(uuid,integer,text,text) from public;
grant execute on function public.apex_review(uuid,integer,text,text) to authenticated;
create index apex_tasks_project on apex_tasks(project_id);
create index apex_tasks_assignee on apex_tasks(assignee_id,due_date);
create index apex_projects_customer on apex_projects(customer_id);
create index apex_comments_task on apex_comments(task_id,created_at);
create index apex_deliverables_customer on apex_deliverables(customer_id);
create index apex_invoices_period on apex_invoices(entity_id,issue_date);
create index apex_cash_invoice on apex_cash(invoice_id);
create index apex_client_customer on apex_client_access(customer_id);
create index apex_activity_entity on apex_activity(entity_type,entity_id,created_at);
-- Financial source movements are append-only; correct them with an opposite movement.
drop policy staff_update on apex_cash;
drop policy staff_update on apex_comments;
-- New Auth users receive no legacy access, even if an old signup trigger creates a profile.
do $$ declare t record; begin
 for t in select tablename from pg_tables where schemaname='public' and tablename not like 'apex_%' loop
 execute format('alter table public.%I enable row level security',t.tablename);
 execute format('create policy apex_legacy_staff_only on public.%I as restrictive for all to authenticated using (public.apex_is_staff()) with check (public.apex_is_staff())',t.tablename);
 end loop;
end $$;
-- A private bucket is read only through short-lived, staff-authorized signed URLs.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('apex-documents','apex-documents',false,20971520,array['application/pdf','image/jpeg','image/png','image/webp']) on conflict(id) do nothing;

create function apex_invoice_document_saved() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.document_id is not null then update apex_documents set status='Kaydedildi' where id=new.document_id; end if; return new;
end $$;
revoke all on function apex_invoice_document_saved() from public;
create trigger apex_document_saved after insert or update on apex_invoices for each row execute function apex_invoice_document_saved();
create function apex_consistency() returns trigger language plpgsql set search_path=public as $$
declare cid uuid; predecessor apex_tasks;
begin
 if new.project_id is not null then
 select customer_id into cid from apex_projects where id=new.project_id;
 if new.customer_id is distinct from cid then raise exception 'Müşteri ve proje eşleşmiyor'; end if;
 end if;
 if tg_table_name='apex_tasks' then
 if new.predecessor_id is not null then
 if new.predecessor_id=new.id then raise exception 'İş kendisini bekleyemez'; end if;
 select * into predecessor from apex_tasks where id=new.predecessor_id;
 if predecessor.project_id is distinct from new.project_id then raise exception 'Önceki iş aynı projede olmalı'; end if;
 if new.status in ('Yapılıyor','Kontrolde','Tamamlandı') and predecessor.status<>'Tamamlandı' then raise exception 'Önceki adım tamamlanmalı'; end if;
 if exists(with recursive chain as (select id,predecessor_id from apex_tasks where id=new.predecessor_id union select t.id,t.predecessor_id from apex_tasks t join chain c on t.id=c.predecessor_id) select 1 from chain where id=new.id) then raise exception 'İş sırası döngü oluşturamaz'; end if;
 end if;
 end if;
 return new;
end $$;
create trigger apex_consistency before insert or update on apex_tasks for each row execute function apex_consistency();
create trigger apex_consistency before insert or update on apex_deliverables for each row execute function apex_consistency();
create trigger apex_consistency before insert or update on apex_invoices for each row execute function apex_consistency();
-- Cash and comments also contribute to the auditable activity stream.
create trigger apex_audit after insert on apex_cash for each row execute function apex_audit();
create trigger apex_audit after insert on apex_comments for each row execute function apex_audit();
alter table apex_documents add column processing_started_at timestamptz;
commit;

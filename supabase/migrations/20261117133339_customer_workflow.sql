begin;
alter table public.apex_client_access add column enabled boolean not null default true;
create or replace function public.apex_can_view_customer(cid uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from apex_client_access a join apex_members m on m.id=a.user_id join apex_customers c on c.id=a.customer_id where a.user_id=auth.uid() and a.customer_id=cid and a.enabled and m.active and m.role='client' and not c.archived);
$$;
alter table public.apex_drive_shares drop constraint apex_drive_shares_status_check;
alter table public.apex_drive_shares add constraint apex_drive_shares_status_check check(status in ('pending','shared','error','blocked','revoking','revoked'));
create or replace function apex_internal.queue_customer_drive_share() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not new.enabled then
  update public.apex_drive_shares set status='revoking',error=null,last_attempt_at=null where user_id=new.user_id and customer_id=new.customer_id;
 elsif exists(select 1 from public.apex_customers where id=new.customer_id and not archived) then
  insert into public.apex_drive_folders(customer_id) values(new.customer_id) on conflict(customer_id) do nothing;
  insert into public.apex_drive_shares(customer_id,user_id,email)
   select new.customer_id,new.user_id,lower(trim(m.email)) from public.apex_members m where m.id=new.user_id and m.active and m.role='client'
   on conflict(customer_id,user_id) do update set email=excluded.email,status='pending',error=null;
 end if;
 return new;
end $$;
create index apex_drive_revoking on public.apex_drive_shares(last_attempt_at) where status='revoking';

create table public.apex_requests (
 id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.apex_customers(id),
 created_by uuid not null references public.apex_members(id), title text not null check(length(trim(title)) between 1 and 300),
 description text not null default '' check(length(description)<=6000), reference_url text not null default '' check(length(reference_url)<=2000),
 desired_date date, status text not null default 'Yeni' check(status in ('Yeni','Planlandı','Kapandı')),
 task_id uuid unique references public.apex_tasks(id), reply text not null default '' check(length(reply)<=4000),
 extra_price numeric(14,2) check(extra_price>=0), out_of_scope boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1
);
create table public.apex_request_files (
 id uuid primary key default gen_random_uuid(), request_id uuid not null references public.apex_requests(id) on delete cascade,
 name text not null, storage_path text not null unique, mime text not null, size bigint not null,
 created_by uuid not null references public.apex_members(id), created_at timestamptz not null default now()
);
create table public.apex_scopes (
 id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.apex_customers(id),
 month date not null check(extract(day from month)=1), quotas jsonb not null default '[]' check(jsonb_typeof(quotas)='array' and jsonb_array_length(quotas)<=20),
 note text not null default '' check(length(note)<=2000), unique(customer_id,month),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1
);
-- Resumable upload credentials stay server-only. Browsers receive a scoped opaque row ID.
create table public.apex_uploads (
 id uuid primary key, customer_id uuid not null references public.apex_customers(id), created_by uuid not null references public.apex_members(id),
 file_id text unique, folder_id text not null, session_url text, name text not null, mime text not null,
 size bigint not null check(size>0 and size<=2147483648), uploaded bigint not null default 0 check(uploaded>=0),
 status text not null default 'pending' check(status in ('pending','uploading','ready')),
 lease_token uuid, lease_until timestamptz, created_at timestamptz not null default now()
);
alter table public.apex_deliverables alter column project_id drop not null;
alter table public.apex_deliverables add column out_of_scope boolean not null default false;
alter table public.apex_events add column out_of_scope boolean not null default false;
alter table public.apex_reviews add column seconds integer check(seconds between 0 and 86400), add column resolved boolean not null default false, add column resolved_at timestamptz;

-- New workflow metadata is visible to staff only; clients use the narrow server projection.
do $$ declare t text; begin
 foreach t in array array['apex_requests','apex_request_files','apex_scopes','apex_uploads'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant all on public.%I to service_role',t);
  if t<>'apex_uploads' then
   execute format('grant select on public.%I to authenticated',t);
   execute format('create policy staff_read on public.%I for select to authenticated using(public.apex_is_staff())',t);
  end if;
 end loop;
 foreach t in array array['apex_requests','apex_scopes'] loop
  execute format('grant insert,update on public.%I to authenticated',t);
  execute format('create policy staff_insert on public.%I for insert to authenticated with check(public.apex_is_staff())',t);
  execute format('create policy staff_update on public.%I for update to authenticated using(public.apex_is_staff()) with check(public.apex_is_staff())',t);
  execute format('create trigger apex_touch before update on public.%I for each row execute function public.apex_touch()',t);
  execute format('create trigger apex_audit after insert or update on public.%I for each row execute function public.apex_audit()',t);
 end loop;
end $$;
create index apex_requests_customer on public.apex_requests(customer_id,created_at);
create index apex_request_files_request on public.apex_request_files(request_id);
create index apex_uploads_customer on public.apex_uploads(customer_id,created_at);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('apex-request-files','apex-request-files',false,20971520,array['application/pdf','image/jpeg','image/png','image/webp']) on conflict(id) do nothing;

create function public.apex_plan_request(p_id uuid,p_version integer,p_assignee uuid,p_due date,p_extra boolean,p_price numeric,p_reply text) returns uuid language plpgsql security invoker set search_path=public as $$
declare r apex_requests; tid uuid;
begin
 if not apex_is_staff() then raise exception 'Yetkiniz yok'; end if;
 select * into r from apex_requests where id=p_id for update;
 if not found then raise exception 'Talep bulunamadı'; end if;
 if r.task_id is not null then return r.task_id; end if;
 if r.version<>p_version then raise exception 'CONFLICT'; end if;
 if r.status<>'Yeni' or not exists(select 1 from apex_customers where id=r.customer_id and not archived) then raise exception 'Talep planlanamaz'; end if;
 if p_due is null or not exists(select 1 from apex_members where id=p_assignee and active and role in ('partner','staff')) then raise exception 'Sorumlu ve tarih gerekiyor'; end if;
 if p_extra and (p_price is null or p_price<0) then raise exception 'Ek iş teklifini girin'; end if;
 if length(p_reply)>4000 then raise exception 'Not çok uzun'; end if;
 insert into apex_tasks(customer_id,title,assignee_id,due_date,description,kind,scope_decision,shared,customer_note)
 values(r.customer_id,r.title,p_assignee,p_due,r.description,case when p_extra then 'Ek iş' else 'İş' end,case when p_extra then 'Ek iş teklifi: '||p_price||' TL. Müşteri kabulü ayrıca kaydedilmelidir.' else '' end,true,p_reply) returning id into tid;
 update apex_requests set task_id=tid,status='Planlandı',out_of_scope=p_extra,extra_price=case when p_extra then p_price else null end,reply=p_reply where id=r.id;
 return tid;
end $$;
revoke all on function public.apex_plan_request(uuid,integer,uuid,date,boolean,numeric,text) from public,anon;
grant execute on function public.apex_plan_request(uuid,integer,uuid,date,boolean,numeric,text) to authenticated;

-- Client reviews require privileged writes, but authorization and exact revision are checked under the same row lock.
create function public.apex_review_timed(p_id uuid,p_revision integer,p_decision text,p_comment text,p_seconds integer,p_review_id uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare d apex_deliverables; existing apex_reviews;
begin
 select * into d from apex_deliverables where id=p_id for update;
 if not found or not (apex_is_staff() or (d.shared and apex_can_view_customer(d.customer_id))) then raise exception 'Yetkiniz yok'; end if;
 select * into existing from apex_reviews where id=p_review_id;
 if found then
  if existing.deliverable_id=p_id and existing.created_by=auth.uid() and existing.revision=p_revision and existing.decision=p_decision and existing.comment=p_comment and existing.seconds is not distinct from p_seconds then return existing.id; end if;
  raise exception 'CONFLICT';
 end if;
 if d.revision<>p_revision then raise exception 'CONFLICT'; end if;
 if p_decision not in ('Onaylandı','Revizyon istendi','Yorum') or length(p_comment)>4000 or p_seconds<0 or p_seconds>86400 then raise exception 'Geçersiz yanıt'; end if;
 if p_decision<>'Yorum' and d.status not in ('Onay bekliyor','Revizyon istendi') then raise exception 'Bu sürüm onay beklemiyor'; end if;
 if p_decision='Revizyon istendi' and length(trim(p_comment))=0 then raise exception 'Revizyon notu gerekiyor'; end if;
 if p_decision='Onaylandı' and exists(select 1 from apex_reviews where deliverable_id=p_id and revision=p_revision and decision='Revizyon istendi' and not resolved) then raise exception 'Önce revizyonları tamamlayın'; end if;
 insert into apex_reviews(id,deliverable_id,revision,decision,comment,seconds) values(p_review_id,p_id,p_revision,p_decision,p_comment,p_seconds);
 if p_decision<>'Yorum' then update apex_deliverables set status=p_decision where id=p_id; end if;
 return p_review_id;
end $$;
create or replace function public.apex_review(p_id uuid,p_revision integer,p_decision text,p_comment text) returns uuid language sql security invoker set search_path=public as $$
 select public.apex_review_timed(p_id,p_revision,p_decision,p_comment,null,gen_random_uuid());
$$;
revoke all on function public.apex_review_timed(uuid,integer,text,text,integer,uuid) from public,anon;
grant execute on function public.apex_review_timed(uuid,integer,text,text,integer,uuid) to authenticated;

create function apex_internal.check_task_completion() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.status='Tamamlandı' and (tg_op='INSERT' or old.status is distinct from new.status) then
  if exists(select 1 from jsonb_array_elements(new.checklist) i where i->>'done' is distinct from 'true') then raise exception 'İşi kapatmadan kontrol listesini tamamlayın'; end if;
 end if;
 return new;
end $$;
revoke all on function apex_internal.check_task_completion() from public,anon,authenticated;
create trigger apex_completion_check before insert or update on public.apex_tasks for each row execute function apex_internal.check_task_completion();
commit;

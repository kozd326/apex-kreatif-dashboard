begin;
create table public.apex_drive_folders (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null unique references public.apex_customers(id) on delete cascade,
 file_id text unique,
 status text not null default 'pending' check(status in ('pending','ready')),
 error text, last_attempt_at timestamptz,
 lease_token uuid, lease_until timestamptz,
 created_at timestamptz not null default now()
);
create table public.apex_drive_shares (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null, user_id uuid not null,
 email text not null check(email=lower(trim(email)) and length(email)<=320),
 status text not null default 'pending' check(status in ('pending','shared','error','blocked')),
 permission_id text, error text, last_attempt_at timestamptz,
 created_at timestamptz not null default now(),
 unique(customer_id,user_id),
 foreign key(user_id,customer_id) references public.apex_client_access(user_id,customer_id) on delete cascade
);
alter table public.apex_drive_folders enable row level security;
alter table public.apex_drive_shares enable row level security;
revoke all on public.apex_drive_folders,public.apex_drive_shares from public,anon,authenticated;
grant select on public.apex_drive_folders,public.apex_drive_shares to authenticated;
grant all on public.apex_drive_folders,public.apex_drive_shares to service_role;
create policy drive_folders_staff_read on public.apex_drive_folders for select to authenticated using(public.apex_is_staff());
create policy drive_shares_staff_read on public.apex_drive_shares for select to authenticated using(public.apex_is_staff());
create index apex_drive_pending_folders on public.apex_drive_folders(last_attempt_at) where status='pending' or error is not null;
create index apex_drive_pending_shares on public.apex_drive_shares(last_attempt_at) where status in ('pending','error');
-- Durable queue entries are committed atomically with customer creation and access grants.
-- Trigger functions live in a non-exposed schema and cannot be called by browser roles.
create schema if not exists apex_internal;
revoke all on schema apex_internal from public,anon,authenticated;
create function apex_internal.queue_customer_drive() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not new.archived then
  insert into public.apex_drive_folders(customer_id) values(new.id) on conflict(customer_id) do nothing;
 end if;
 return new;
end $$;
create function apex_internal.queue_customer_drive_share() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.apex_customers where id=new.customer_id and not archived) then
  insert into public.apex_drive_folders(customer_id) values(new.customer_id) on conflict(customer_id) do nothing;
  insert into public.apex_drive_shares(customer_id,user_id,email)
   select new.customer_id,new.user_id,lower(trim(m.email)) from public.apex_members m where m.id=new.user_id and m.active and m.role='client'
   on conflict(customer_id,user_id) do update set email=excluded.email,status='pending',error=null;
 end if;
 return new;
end $$;
revoke all on function apex_internal.queue_customer_drive(),apex_internal.queue_customer_drive_share() from public,anon,authenticated;
create trigger apex_customer_drive_queue after insert on public.apex_customers for each row execute function apex_internal.queue_customer_drive();
create trigger apex_customer_drive_share_queue after insert or update on public.apex_client_access for each row execute function apex_internal.queue_customer_drive_share();
commit;

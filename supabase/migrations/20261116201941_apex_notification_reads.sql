begin;
create table public.apex_notification_reads (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.apex_members(id) on delete cascade,
  key text not null check (length(key) between 1 and 200),
  read_at timestamptz not null default now(),
  unique (member_id, key)
);
alter table public.apex_notification_reads enable row level security;
revoke all on public.apex_notification_reads from anon, authenticated;
grant select, insert on public.apex_notification_reads to authenticated;
grant all on public.apex_notification_reads to service_role;
create policy notification_reads_own_select on public.apex_notification_reads
  for select to authenticated
  using (member_id = (select auth.uid()) and (select public.apex_is_staff()));
create policy notification_reads_own_insert on public.apex_notification_reads
  for insert to authenticated
  with check (member_id = (select auth.uid()) and (select public.apex_is_staff()));
commit;

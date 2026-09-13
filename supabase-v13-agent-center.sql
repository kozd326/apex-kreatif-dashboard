-- APEX Agent Center: auditable, owner-scoped expert drafts and coordinator-approved reports.
begin;

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  client_brand_id uuid references public.client_brands(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  expert_role text not null check (expert_role in ('direktor','marka-stratejisti','satis-asistani','kreatif-direktor','sosyal-medya','performans','web-seo','musteri-basari','produksiyon-yoneticisi','tasarim-uzmani','genel-koordinator')),
  brief text not null check (char_length(brief) between 3 and 8000),
  context_snapshot jsonb not null default '{}'::jsonb,
  expert_output text,
  coordinator_output text,
  final_output text,
  status text not null default 'Çalışıyor' check (status in ('Çalışıyor','Hazır','Başarısız')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_runs_owner_created_idx on public.agent_runs(owner_id, created_at desc);
create index if not exists agent_runs_brand_idx on public.agent_runs(client_brand_id, created_at desc);
create index if not exists agent_runs_project_idx on public.agent_runs(project_id, created_at desc);

-- Persistent, atomic per-user AI-cost reservation. The upsert locks one owner
-- row, so parallel requests cannot all pass the limit before model calls begin.
create table if not exists public.agent_rate_limits (
  owner_id uuid primary key references public.profiles(id) on delete cascade,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0)
);
alter table public.agent_rate_limits enable row level security;

create or replace function public.reserve_agent_run()
returns boolean
language plpgsql
security definer set search_path=public
as $$
declare
  reserved boolean := false;
begin
  if auth.uid() is null or not public.crm_can_write() then
    return false;
  end if;

  insert into public.agent_rate_limits as rate_limit (owner_id, window_started_at, request_count)
  values (auth.uid(), now(), 1)
  on conflict (owner_id) do update
    set window_started_at = case when rate_limit.window_started_at <= now() - interval '10 minutes' then now() else rate_limit.window_started_at end,
        request_count = case when rate_limit.window_started_at <= now() - interval '10 minutes' then 1 else rate_limit.request_count + 1 end
    where rate_limit.window_started_at <= now() - interval '10 minutes' or rate_limit.request_count < 6
  returning true into reserved;

  return coalesce(reserved, false);
end;
$$;
revoke all on function public.reserve_agent_run() from public;
grant execute on function public.reserve_agent_run() to authenticated;

alter table public.agent_runs enable row level security;
drop policy if exists agent_runs_read on public.agent_runs;
drop policy if exists agent_runs_write on public.agent_runs;
create policy agent_runs_read on public.agent_runs for select to authenticated using (owner_id=auth.uid() or exists(select 1 from public.profiles where id=auth.uid() and role::text='Yönetici'));
-- There is intentionally no INSERT/UPDATE/DELETE policy. Only the authenticated
-- API route, using the server-only service-role key after its own role checks,
-- may create a run or mark a report as coordinator-approved.
drop trigger if exists set_agent_runs_updated_at on public.agent_runs;
create trigger set_agent_runs_updated_at before update on public.agent_runs for each row execute function public.update_updated_at_column();

commit;

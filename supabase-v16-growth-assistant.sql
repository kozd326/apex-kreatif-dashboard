-- APEX v16: Approval-first growth system. Run after v15.
-- This migration deliberately stores plans and approvals only; it never sends a change to Meta or Google.
begin;

create table if not exists public.growth_workspaces (
  id uuid primary key default gen_random_uuid(),
  project_id uuid unique references public.projects(id) on delete cascade,
  client_brand_id uuid references public.client_brands(id) on delete set null,
  website_url text check (website_url is null or website_url ~ '^https?://'),
  primary_conversion text not null default '',
  monthly_media_budget numeric(12,2) not null default 0 check (monthly_media_budget >= 0),
  measurement_status text not null default 'Planlanmadı' check (measurement_status in ('Planlanmadı','Kurulumda','Doğrulandı')),
  created_by uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.growth_recommendations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.growth_workspaces(id) on delete cascade,
  area text not null check (area in ('Ölçüm','SEO','Meta','Google Ads','İçerik','Web')),
  title text not null check (char_length(title) between 3 and 180),
  rationale text not null check (char_length(rationale) between 3 and 4000),
  proposed_change text not null check (char_length(proposed_change) between 3 and 4000),
  risk_note text not null default '',
  status text not null default 'Taslak' check (status in ('Taslak','Onay Bekliyor','Onaylandı','Reddedildi','Uygulandı')),
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_by uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check ((status <> 'Onaylandı' and status <> 'Uygulandı') or approved_by is not null)
);

create index if not exists growth_recommendations_workspace_status_idx on public.growth_recommendations(workspace_id, status, created_at desc);
alter table public.growth_workspaces enable row level security;
alter table public.growth_recommendations enable row level security;
drop policy if exists crm_growth_workspaces_read on public.growth_workspaces;
drop policy if exists crm_growth_workspaces_write on public.growth_workspaces;
drop policy if exists crm_growth_recommendations_read on public.growth_recommendations;
drop policy if exists crm_growth_recommendations_write on public.growth_recommendations;
create policy crm_growth_workspaces_read on public.growth_workspaces for select to authenticated using (exists(select 1 from public.profiles where id=auth.uid()));
create policy crm_growth_workspaces_write on public.growth_workspaces for all to authenticated using (public.crm_can_write()) with check (public.crm_can_write());
create policy crm_growth_recommendations_read on public.growth_recommendations for select to authenticated using (exists(select 1 from public.profiles where id=auth.uid()));
create policy crm_growth_recommendations_write on public.growth_recommendations for all to authenticated using (public.crm_can_write()) with check (public.crm_can_write());
drop trigger if exists set_growth_workspaces_updated_at on public.growth_workspaces;
create trigger set_growth_workspaces_updated_at before update on public.growth_workspaces for each row execute function public.update_updated_at_column();
drop trigger if exists set_growth_recommendations_updated_at on public.growth_recommendations;
create trigger set_growth_recommendations_updated_at before update on public.growth_recommendations for each row execute function public.update_updated_at_column();

commit;

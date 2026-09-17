-- APEX v18 — proposal documents, reusable sector solutions and safe client intake.
-- Additive migration: it does not delete, rename or overwrite existing records.
create table if not exists public.solution_library (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 160),
  sector text not null default 'Genel',
  category text not null default 'SaaS / Dashboard',
  status text not null default 'Taslak' check (status in ('Taslak','Satışa Hazır','Arşiv')),
  description text,
  modules jsonb not null default '[]'::jsonb check (jsonb_typeof(modules) = 'array'),
  deliverables jsonb not null default '[]'::jsonb check (jsonb_typeof(deliverables) = 'array'),
  demo_url text,
  cover_url text,
  proposal_defaults jsonb not null default '{}'::jsonb check (jsonb_typeof(proposal_defaults) = 'object'),
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.proposals add column if not exists solution_id uuid references public.solution_library(id) on delete set null;
create index if not exists proposals_solution_id_idx on public.proposals(solution_id);
create index if not exists solution_library_status_idx on public.solution_library(status, sector);

alter table public.solution_library enable row level security;
drop policy if exists solution_library_read on public.solution_library;
drop policy if exists solution_library_write on public.solution_library;
create policy solution_library_read on public.solution_library for select to authenticated
  using (exists(select 1 from public.profiles where id=auth.uid()));
create policy solution_library_write on public.solution_library for all to authenticated
  using (public.crm_can_write()) with check (public.crm_can_write());

drop trigger if exists set_solution_library_updated_at on public.solution_library;
create trigger set_solution_library_updated_at before update on public.solution_library
  for each row execute function public.update_updated_at_column();

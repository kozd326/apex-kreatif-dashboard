-- APEX v9: reliable cash collection, reversible records and the content / Reels workspace.
-- Run once in Supabase SQL Editor after the v8 suite.

begin;

alter table public.payments add column if not exists paid_amount numeric(12,2);
alter table public.payments add constraint payments_paid_amount_range
  check (paid_amount is null or (paid_amount >= 0 and paid_amount <= amount)) not valid;
alter table public.payments validate constraint payments_paid_amount_range;

update public.payments
set paid_amount = amount
where status = 'Tamamlandı' and paid_amount is null;

create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 180),
  format text not null check (format in ('Reels','Post','Story','Carousel','Case Study')),
  stage text not null default 'Fikir' check (stage in ('Fikir','Senaryo','Üretimde','İncelemede','Planlandı','Yayınlandı')),
  pillar text not null default 'Ajans Tanıtımı',
  objective text,
  hook text,
  script text,
  production_notes text,
  caption text,
  asset_url text,
  planned_for date,
  published_at date,
  owner_id uuid references public.profiles(id) on delete set null,
  owner_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_items_stage_planned_idx on public.content_items(stage, planned_for);
alter table public.content_items enable row level security;
drop policy if exists crm_content_read on public.content_items;
drop policy if exists crm_content_write on public.content_items;
create policy crm_content_read on public.content_items for select to authenticated using (exists(select 1 from public.profiles where id=auth.uid()));
create policy crm_content_write on public.content_items for all to authenticated using (public.crm_can_write()) with check (public.crm_can_write());
drop trigger if exists set_content_items_updated_at on public.content_items;
create trigger set_content_items_updated_at before update on public.content_items for each row execute function public.update_updated_at_column();

create or replace function public.crm_restore_lead(p_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.crm_can_write() then raise exception 'Yetkiniz yok'; end if;
  update public.leads set archived_at=null where id=p_id;
end $$;

create or replace function public.crm_restore_project(p_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.crm_can_write() then raise exception 'Yetkiniz yok'; end if;
  update public.projects set archived_at=null where id=p_id;
end $$;

revoke all on function public.crm_restore_lead(uuid), public.crm_restore_project(uuid) from public;
grant execute on function public.crm_restore_lead(uuid), public.crm_restore_project(uuid) to authenticated;

commit;

-- APEX v15: project brand onboarding and per-content client approval.
-- Run after supabase-v14-agent-usage.sql. This is additive and keeps existing portal links working.
begin;

create table if not exists public.project_brand_briefs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  client_brand_id uuid references public.client_brands(id) on delete set null,
  positioning text not null default '', target_audience text not null default '', primary_offer text not null default '',
  brand_voice text not null default '', must_use text not null default '', avoid text not null default '',
  reference_links jsonb not null default '[]'::jsonb check (jsonb_typeof(reference_links) = 'array' and octet_length(reference_links::text) < 30000),
  approval_status text not null default 'Taslak' check (approval_status in ('Taslak','Müşteri Bekliyor','Onaylandı','Revizyon İstendi')),
  client_feedback text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.project_brand_briefs enable row level security;
drop policy if exists crm_brand_briefs_read on public.project_brand_briefs;
drop policy if exists crm_brand_briefs_write on public.project_brand_briefs;
create policy crm_brand_briefs_read on public.project_brand_briefs for select to authenticated using (exists(select 1 from public.profiles where id=auth.uid()));
create policy crm_brand_briefs_write on public.project_brand_briefs for all to authenticated using (public.crm_can_write()) with check (public.crm_can_write());
drop trigger if exists set_project_brand_briefs_updated_at on public.project_brand_briefs;
create trigger set_project_brand_briefs_updated_at before update on public.project_brand_briefs for each row execute function public.update_updated_at_column();

alter table public.content_items add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.content_items add column if not exists approval_status text not null default 'Taslak' check (approval_status in ('Taslak','Müşteri İncelemesinde','Onaylandı','Revizyon İstendi'));
alter table public.content_items add column if not exists approval_note text;
alter table public.content_items add column if not exists approved_at timestamptz;
alter table public.content_items add column if not exists approval_updated_at timestamptz;
create index if not exists content_items_project_approval_idx on public.content_items(project_id, approval_status, created_at desc);

create table if not exists public.content_reviews (
  id uuid primary key default gen_random_uuid(), content_item_id uuid not null references public.content_items(id) on delete cascade,
  share_id uuid not null references public.crm_shares(id) on delete cascade,
  reviewer_name text not null check (char_length(reviewer_name) between 1 and 100),
  decision text not null check (decision in ('Onaylandı','Revizyon İstendi')),
  comment text not null check (char_length(comment) between 1 and 4000), created_at timestamptz not null default now()
);
create index if not exists content_reviews_content_created_idx on public.content_reviews(content_item_id, created_at desc);
alter table public.content_reviews enable row level security;
drop policy if exists crm_content_reviews_read on public.content_reviews;
create policy crm_content_reviews_read on public.content_reviews for select to authenticated using (exists(select 1 from public.profiles where id=auth.uid()));

create or replace function public.crm_share_content_decision(p_token text, p_content_item uuid, p_name text, p_decision text, p_comment text)
returns void language plpgsql security definer set search_path=public as $$
declare s public.crm_shares; c public.content_items; v_limit integer;
begin
  if p_token !~ '^[a-f0-9]{64}$' or p_content_item is null then raise exception 'Paylaşım bulunamadı'; end if;
  select * into s from public.crm_shares where token_hash=encode(digest(p_token,'sha256'),'hex') and revoked_at is null and expires_at>now() for update;
  if not found then raise exception 'Paylaşım bulunamadı'; end if;
  if length(trim(p_name)) not between 1 and 100 or length(trim(p_comment)) not between 1 and 4000 or p_decision not in ('Onaylandı','Revizyon İstendi') then raise exception 'Onay bilgileri geçersiz'; end if;
  select count(*) into v_limit from public.content_reviews where share_id=s.id and created_at>now()-interval '1 minute';
  if v_limit >= 5 then raise exception 'Lütfen bir dakika bekleyin'; end if;
  if not exists(select 1 from jsonb_array_elements(coalesce(s.published->'content_items','[]'::jsonb)) item where item->>'id'=p_content_item::text) then raise exception 'Bu içerik bu paylaşımda yer almıyor'; end if;
  select * into c from public.content_items where id=p_content_item for update;
  if not found then raise exception 'İçerik bulunamadı'; end if;
  insert into public.content_reviews(content_item_id,share_id,reviewer_name,decision,comment) values(p_content_item,s.id,trim(p_name),p_decision,trim(p_comment));
  insert into public.crm_feedback(share_id,name,message,kind) values(s.id,trim(p_name),trim(p_comment),case when p_decision='Onaylandı' then 'Onay' else 'Revizyon' end);
  update public.content_items set approval_status=p_decision, approval_note=trim(p_comment), approval_updated_at=now(), approved_at=case when p_decision='Onaylandı' then now() else null end, stage=case when p_decision='Onaylandı' and stage='İncelemede' then 'Planlandı' else stage end where id=c.id;
end $$;
revoke all on function public.crm_share_content_decision(text,uuid,text,text,text) from public;
grant execute on function public.crm_share_content_decision(text,uuid,text,text,text) to anon,authenticated;

commit;

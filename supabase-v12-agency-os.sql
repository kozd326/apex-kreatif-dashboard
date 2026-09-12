-- APEX Agency OS v1: advertising performance and atomic proposal conversion.
-- Additive migration; existing CRM records are preserved.
begin;

alter table public.content_items add column if not exists brand_name text generated always as (client_name) stored;
alter table public.content_items add column if not exists client_brand_id uuid references public.client_brands(id) on delete set null;
create index if not exists content_items_brand_name_idx on public.content_items(brand_name);
create index if not exists content_items_client_brand_idx on public.content_items(client_brand_id);

create table if not exists public.ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  name text not null check (char_length(name) between 2 and 160),
  platform text not null check (platform in ('Meta','Google','TikTok','Diğer')),
  objective text not null default 'Mesaj', audience text, creative_name text,
  status text not null default 'Taslak' check (status in ('Taslak','Testte','Aktif','Duraklatıldı','Tamamlandı')),
  budget numeric(12,2) not null default 0 check (budget >= 0),
  spend numeric(12,2) not null default 0 check (spend >= 0),
  impressions integer not null default 0 check (impressions >= 0),
  clicks integer not null default 0 check (clicks >= 0),
  results integer not null default 0 check (results >= 0),
  sales_value numeric(12,2) not null default 0 check (sales_value >= 0),
  start_date date, end_date date, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.ad_campaigns add column if not exists owner_id uuid references public.profiles(id) on delete restrict;
update public.ad_campaigns campaign set owner_id=coalesce(
  (select assigned_to from public.projects where id=campaign.project_id),
  (select assigned_to from public.leads where id=campaign.lead_id),
  (select id from public.profiles order by (role::text='Yönetici') desc,created_at asc limit 1)
) where owner_id is null;
alter table public.ad_campaigns alter column owner_id set default auth.uid();
do $$ begin
  if not exists(select 1 from public.ad_campaigns where owner_id is null) then alter table public.ad_campaigns alter column owner_id set not null; end if;
end $$;
create index if not exists ad_campaigns_status_idx on public.ad_campaigns(status, start_date);
alter table public.ad_campaigns enable row level security;
drop policy if exists crm_ads_read on public.ad_campaigns;
drop policy if exists crm_ads_write on public.ad_campaigns;
create policy crm_ads_read on public.ad_campaigns for select to authenticated using (owner_id=auth.uid() or exists(select 1 from public.profiles where id=auth.uid() and role::text='Yönetici'));
create policy crm_ads_write on public.ad_campaigns for all to authenticated using ((owner_id=auth.uid() or exists(select 1 from public.profiles where id=auth.uid() and role::text='Yönetici')) and public.crm_can_write()) with check ((owner_id=auth.uid() or exists(select 1 from public.profiles where id=auth.uid() and role::text='Yönetici')) and public.crm_can_write());
drop trigger if exists set_ad_campaigns_updated_at on public.ad_campaigns;
create trigger set_ad_campaigns_updated_at before update on public.ad_campaigns for each row execute function public.update_updated_at_column();

alter table public.payments add column if not exists payment_kind text check(payment_kind in ('deposit','balance'));
with candidates as (
  select p.id,case when p.title='Kapora' then 'deposit' else 'balance' end kind,
    row_number() over(partition by p.project_id,p.title order by p.created_at,p.id) sequence
  from public.payments p join public.projects pr on pr.id=p.project_id
  where p.payment_kind is null and p.title in ('Kapora','Kalan ödeme') and pr.proposal_id is not null
)
update public.payments p set payment_kind=c.kind from candidates c where p.id=c.id and c.sequence=1;
create unique index if not exists payments_project_kind_uidx on public.payments(project_id,payment_kind) where payment_kind is not null;

create or replace function public.crm_lock_accepted_proposal() returns trigger language plpgsql set search_path=public as $$
begin
  if old.status::text='Kabul' and new.status::text<>'Kabul' then raise exception 'Projeye dönüştürülmüş teklifin durumu değiştirilemez'; end if;
  return new;
end $$;
drop trigger if exists lock_accepted_proposal_status on public.proposals;
create trigger lock_accepted_proposal_status before update of status on public.proposals for each row execute function public.crm_lock_accepted_proposal();

create or replace function public.crm_accept_proposal(p_proposal uuid, p_deposit_percent integer default 50)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_proposal proposals; v_project uuid; v_deposit numeric(12,2);
begin
  if not public.crm_can_write() then raise exception 'Yetkiniz yok'; end if;
  if p_deposit_percent < 1 or p_deposit_percent > 99 then raise exception 'Kapora oranı geçersiz'; end if;
  select * into v_proposal from proposals where id=p_proposal for update;
  if not found then raise exception 'Teklif bulunamadı'; end if;
  select id into v_project from projects where proposal_id=p_proposal limit 1;
  if v_project is null then
    insert into projects(proposal_id,lead_id,project_name,client_name,service_type,assigned_to,assigned_name,start_date,deadline,status,total_fee,payment_status,client_notes,deliverables)
    values(v_proposal.id,v_proposal.lead_id,v_proposal.title,v_proposal.lead_name,v_proposal.service_package,auth.uid(),coalesce((select name from profiles where id=auth.uid()),'Ekip'),current_date,coalesce(v_proposal.valid_until,current_date+30),'Devam Ediyor',v_proposal.amount,'Ödeme Bekliyor',v_proposal.notes,v_proposal.service_package) returning id into v_project;
  end if;
  v_deposit := round(v_proposal.amount * p_deposit_percent / 100.0, 2);
  if exists(select 1 from payments where project_id=v_project and payment_kind is null) then
    raise exception 'Projede manuel ödeme satırı var; otomatik plan oluşturmadan önce tahsilat planını uzlaştırın';
  end if;
  insert into payments(project_id,title,amount,due_date,status,payment_kind)
  values(v_project,'Kapora',v_deposit,current_date,'Ödeme Bekliyor','deposit')
  on conflict(project_id,payment_kind) where payment_kind is not null do update set amount=excluded.amount,due_date=excluded.due_date;
  insert into payments(project_id,title,amount,due_date,status,payment_kind)
  values(v_project,'Kalan ödeme',v_proposal.amount-v_deposit,coalesce(v_proposal.valid_until,current_date+30),'Ödeme Bekliyor','balance')
  on conflict(project_id,payment_kind) where payment_kind is not null do update set amount=excluded.amount,due_date=excluded.due_date;
  update proposals set status='Kabul' where id=p_proposal;
  if v_proposal.lead_id is not null then
    update leads set status='Kazanıldı',estimated_deal_value=v_proposal.amount,win_probability=100 where id=v_proposal.lead_id;
    insert into client_brands(lead_id,project_id,company_name,created_by)
    values(v_proposal.lead_id,v_project,v_proposal.lead_name,auth.uid())
    on conflict(lead_id) do update set project_id=excluded.project_id,updated_at=now();
  end if;
  insert into project_checklists(project_id,title,assigned_to,assigned_name)
  select v_project,title,auth.uid(),coalesce((select name from profiles where id=auth.uid()),'Ekip')
  from unnest(array['Brief ve hedefler alındı','Sözleşme / teklif onayı kaydedildi','Kapora tahsil edildi','Üretim tamamlandı','Müşteri onayı ve teslim alındı']) title
  where not exists(select 1 from project_checklists c where c.project_id=v_project and c.title=title);
  insert into crm_proposal_events(proposal_id,event_type,detail,actor_id)
  select p_proposal,'Kabul','Proje ve ödeme planı otomatik oluşturuldu.',auth.uid()
  where not exists(select 1 from crm_proposal_events where proposal_id=p_proposal and event_type='Kabul');
  return v_project;
end $$;
revoke all on function public.crm_accept_proposal(uuid,integer) from public;
grant execute on function public.crm_accept_proposal(uuid,integer) to authenticated;

commit;

-- APEX v17: approval-first scheduled outbound email queue.
-- Run after v16. This migration creates a queue only; no e-mail is sent by this SQL.
begin;

create table if not exists public.outreach_scheduled_emails (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete restrict,
  to_email text not null check (char_length(to_email) between 5 and 320),
  subject text not null check (char_length(subject) between 1 and 160),
  body_text text not null check (char_length(body_text) between 1 and 5000),
  scheduled_at timestamptz not null,
  timezone text not null default 'Europe/Istanbul' check (char_length(timezone) between 3 and 80),
  status text not null default 'Onay Bekliyor' check (status in ('Taslak','Onay Bekliyor','Planlandı','Gönderiliyor','Gönderildi','Başarısız','İptal')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  sent_at timestamptz,
  provider_message_id text,
  last_error text,
  attempt_count integer not null default 0 check (attempt_count between 0 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status not in ('Planlandı','Gönderiliyor','Gönderildi')) or (approved_by is not null and approved_at is not null))
);

create index if not exists outreach_scheduled_emails_due_idx on public.outreach_scheduled_emails(status, scheduled_at);
create index if not exists outreach_scheduled_emails_lead_idx on public.outreach_scheduled_emails(lead_id, created_at desc);

alter table public.outreach_scheduled_emails enable row level security;
drop policy if exists outreach_scheduled_emails_read on public.outreach_scheduled_emails;
create policy outreach_scheduled_emails_read on public.outreach_scheduled_emails
  for select to authenticated
  using (
    created_by = auth.uid()
    or exists(select 1 from public.profiles where id = auth.uid() and role::text = 'Yönetici')
  );
-- Deliberately no browser INSERT/UPDATE/DELETE policies. Only authenticated
-- server routes may create, approve, cancel or dispatch a scheduled e-mail.

drop trigger if exists set_outreach_scheduled_emails_updated_at on public.outreach_scheduled_emails;
create trigger set_outreach_scheduled_emails_updated_at
  before update on public.outreach_scheduled_emails
  for each row execute function public.update_updated_at_column();

commit;

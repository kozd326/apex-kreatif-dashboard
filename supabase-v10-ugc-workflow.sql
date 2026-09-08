-- APEX v10: UGC production brief, creator and rights tracking.
-- Run after supabase-v9-reliability-content.sql.

alter table public.content_items add column if not exists client_name text;
alter table public.content_items add column if not exists creator_name text;
alter table public.content_items add column if not exists creator_status text check (creator_status is null or creator_status in ('Aranacak','Brief gönderildi','Onaylandı','İçerik geldi','Revizyonda','Teslim edildi'));
alter table public.content_items add column if not exists usage_rights text;
alter table public.content_items add column if not exists delivery_due date;

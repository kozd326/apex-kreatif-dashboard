begin;
alter table public.apex_events
  add column all_day boolean not null default false,
  add column description text not null default '' check (length(description)<=12000);
alter table public.apex_events drop constraint apex_events_kind_check;
alter table public.apex_events add constraint apex_events_kind_check check (length(btrim(kind)) between 1 and 100);
alter table public.apex_events add constraint apex_events_all_day_check check (
  not all_day or (
    (starts_at at time zone 'Europe/Istanbul')::time='00:00:00'::time and
    (ends_at at time zone 'Europe/Istanbul')::time='00:00:00'::time
  )
);
commit;

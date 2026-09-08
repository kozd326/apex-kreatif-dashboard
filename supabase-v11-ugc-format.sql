-- APEX v11: UGC is a first-class content format in the content workspace.
-- v9 created the original whitelist before the UGC workflow existed.
alter table public.content_items
  drop constraint if exists content_items_format_check;

alter table public.content_items
  add constraint content_items_format_check
  check (format in ('Reels', 'Post', 'Story', 'Carousel', 'Case Study', 'UGC'));

-- Offers & news can be a text card or a poster image.
-- Safe to re-run. Does not change products, prices, or orders.

alter table public.shop_announcements
  add column if not exists kind text not null default 'news';

alter table public.shop_announcements
  add column if not exists image_url text;

alter table public.shop_announcements
  drop constraint if exists shop_announcements_kind_check;

alter table public.shop_announcements
  add constraint shop_announcements_kind_check
  check (kind in ('offer', 'news'));

comment on column public.shop_announcements.kind is
  'offer or news. Both show in Offers & news on the shop home.';

comment on column public.shop_announcements.image_url is
  'Optional poster. When set, the home slide is this image. Tap opens the full poster.';

notify pgrst, 'reload schema';

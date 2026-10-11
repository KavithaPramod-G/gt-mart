-- Home offer slides: Buy 1 Get 1 tag on products, and shop announcements.
-- Additive only. Does not delete or rewrite products, prices, or orders.

alter table public.products
  add column if not exists offer_tag text;

comment on column public.products.offer_tag is
  'Optional shop offer. bogo lists the product on the Buy 1 Get 1 screen. Null means a normal catalog item.';

create table if not exists public.shop_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  body text,
  badge text,
  emoji text not null default '📢',
  category_id text references public.categories (id) on delete set null,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.shop_announcements enable row level security;

drop policy if exists "shop_announcements_public_read" on public.shop_announcements;

create policy "shop_announcements_public_read"
  on public.shop_announcements
  for select
  to anon, authenticated
  using (active = true);

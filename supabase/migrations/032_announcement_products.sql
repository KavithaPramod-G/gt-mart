-- Link existing products to an offer or news item.
-- The product stays in its category. Safe to re-run.

create table if not exists public.shop_announcement_products (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.shop_announcements (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  sort_order integer not null default 0,
  unique (announcement_id, product_id)
);

alter table public.shop_announcement_products enable row level security;

drop policy if exists "shop_announcement_products_public_read" on public.shop_announcement_products;

create policy "shop_announcement_products_public_read"
  on public.shop_announcement_products
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.shop_announcements announcement
      where announcement.id = announcement_id
        and announcement.active = true
    )
  );

grant select on public.shop_announcement_products to anon, authenticated;

notify pgrst, 'reload schema';

-- Extra category shelves. A product keeps products.category_id and can also
-- appear in an agency category. Safe to re-run.

create table if not exists public.product_category_placements (
  product_id uuid not null references public.products (id) on delete cascade,
  category_id text not null references public.categories (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (product_id, category_id)
);

create index if not exists product_category_placements_category_idx
  on public.product_category_placements (category_id);

alter table public.product_category_placements enable row level security;

drop policy if exists "product_category_placements_public_read" on public.product_category_placements;

create policy "product_category_placements_public_read"
  on public.product_category_placements
  for select
  to anon, authenticated
  using (true);

grant select on public.product_category_placements to anon, authenticated;

notify pgrst, 'reload schema';

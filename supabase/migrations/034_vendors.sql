-- Vendors and an optional link from products.
-- Run in the Supabase SQL Editor. Safe to re-run.
-- Products without a vendor stay blank. The shop app does not show this field.
-- Linking a product does not remove it from its category.

alter table public.products
  add column if not exists vendor text;

comment on column public.products.vendor is
  'Supplier name copied from vendors. Empty means the product is not assigned to a vendor.';

create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendors_name_not_blank check (btrim(name) <> '')
);

create unique index if not exists vendors_name_lower_idx
  on public.vendors (lower(btrim(name)));

alter table public.products
  add column if not exists vendor_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_vendor_id_fkey'
  ) then
    alter table public.products
      add constraint products_vendor_id_fkey
      foreign key (vendor_id) references public.vendors (id) on delete set null;
  end if;
end $$;

create index if not exists products_vendor_id_idx
  on public.products (vendor_id)
  where vendor_id is not null;

create index if not exists products_vendor_idx
  on public.products (vendor)
  where vendor is not null and btrim(vendor) <> '';

insert into public.vendors (name)
select distinct btrim(p.vendor)
from public.products p
where p.vendor is not null
  and btrim(p.vendor) <> ''
  and not exists (
    select 1
    from public.vendors v
    where lower(btrim(v.name)) = lower(btrim(p.vendor))
  );

update public.products p
set vendor_id = v.id,
    vendor = v.name
from public.vendors v
where p.vendor is not null
  and btrim(p.vendor) <> ''
  and lower(btrim(p.vendor)) = lower(btrim(v.name))
  and (p.vendor_id is distinct from v.id or p.vendor is distinct from v.name);

alter table public.vendors enable row level security;

notify pgrst, 'reload schema';

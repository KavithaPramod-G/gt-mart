-- Optional supplier name on products.
-- Run in the Supabase SQL Editor. Safe to re-run.
-- Products without a vendor stay blank. The shop app does not show this field.

alter table public.products
  add column if not exists vendor text;

comment on column public.products.vendor is
  'Optional supplier name. Empty means the product is not assigned to a vendor.';

create index if not exists products_vendor_idx
  on public.products (vendor)
  where vendor is not null and btrim(vendor) <> '';

notify pgrst, 'reload schema';

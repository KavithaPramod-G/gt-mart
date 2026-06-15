-- Add MRP (Maximum Retail Price) to products; price remains the sale price.

alter table public.products
  add column if not exists mrp numeric(10, 2);

update public.products
set mrp = price
where mrp is null;

-- Ensure MRP is at least the sale price for existing rows
update public.products
set mrp = price
where mrp < price;

alter table public.products
  alter column mrp set not null;

alter table public.products
  drop constraint if exists products_mrp_gte_price;

alter table public.products
  add constraint products_mrp_gte_price check (mrp >= price);

comment on column public.products.mrp is 'Maximum retail price (MRP) shown to customers';
comment on column public.products.price is 'Sale price charged at checkout';

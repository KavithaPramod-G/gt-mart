-- Rename product columns only (products table).
-- legacy_id → item_id, name → item_name

alter table public.products rename column legacy_id to item_id;
alter table public.products rename column name to item_name;

comment on column public.products.item_id is 'Item ID — business key from store inventory';
comment on column public.products.item_name is 'Item Name';

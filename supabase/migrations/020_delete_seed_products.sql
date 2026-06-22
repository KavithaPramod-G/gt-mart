-- Remove demo seed products (item_id 1–12 from seed.sql)

delete from public.products
where item_id in (
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'
);

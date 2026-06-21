-- Live store categories (12 departments)
-- Run in Supabase SQL Editor after prior migrations.

insert into public.categories (id, label) values
  ('fruits-vegetables', 'Fruits & Vegetables'),
  ('dairy-eggs', 'Dairy & Eggs'),
  ('staples-grains', 'Staples & Grains'),
  ('oils-ghee', 'Oils & Ghee'),
  ('snacks-beverages', 'Snacks & Beverages'),
  ('bakery', 'Bakery'),
  ('instant-foods', 'Instant Foods'),
  ('dry-fruits-nuts', 'Dry Fruits & Nuts'),
  ('personal-care', 'Personal Care'),
  ('home-care', 'Home Care'),
  ('baby-care', 'Baby Care'),
  ('pet-care', 'Pet Care')
on conflict (id) do update set label = excluded.label;

-- Remap legacy demo categories on existing products
update public.products
set category_id = 'fruits-vegetables'
where category_id in ('vegetables', 'fruits');

update public.products
set category_id = 'dairy-eggs'
where category_id = 'dairy';

update public.products
set category_id = 'snacks-beverages'
where category_id in ('snacks', 'beverages');

update public.products
set category_id = 'home-care'
where category_id = 'household';

delete from public.categories
where id in ('vegetables', 'fruits', 'dairy', 'snacks', 'beverages', 'household');

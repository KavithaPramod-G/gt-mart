-- Seed categories for GT Mart (products are added via admin / Excel import)

insert into public.categories (id, label) values
  ('general-items', 'General Items'),
  ('fruits-vegetables', 'Fruits & Vegetables'),
  ('dairy-eggs', 'Dairy & Eggs'),
  ('staples-grains', 'Staples & Grains'),
  ('oils-ghee', 'Oils & Ghee'),
  ('snacks-beverages', 'Snacks & Beverages'),
  ('chocolates', 'Chocolates'),
  ('ice-creams', 'Ice Creams'),
  ('bakery', 'Bakery'),
  ('instant-foods', 'Instant Foods'),
  ('dry-fruits-nuts', 'Dry Fruits & Nuts'),
  ('personal-care', 'Personal Care'),
  ('home-care', 'Home Care'),
  ('baby-care', 'Baby Care'),
  ('pet-care', 'Pet Care')
on conflict (id) do update set label = excluded.label;

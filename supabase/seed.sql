-- Seed categories and products for GT Mart
-- Run after 001_initial_schema.sql and 006_product_mrp.sql

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

insert into public.products (item_id, item_name, description, mrp, price, unit, category_id, emoji, in_stock) values
  ('1', 'Fresh Tomatoes', 'Locally sourced, ripe red tomatoes', 50, 40, 'kg', 'fruits-vegetables', '🍅', true),
  ('2', 'Onions', 'Premium quality red onions', 45, 35, 'kg', 'fruits-vegetables', '🧅', true),
  ('3', 'Potatoes', 'Farm fresh potatoes', 40, 30, 'kg', 'fruits-vegetables', '🥔', true),
  ('4', 'Bananas', 'Sweet ripe bananas', 60, 50, 'dozen', 'fruits-vegetables', '🍌', true),
  ('5', 'Apples', 'Crisp Kashmiri apples', 220, 180, 'kg', 'fruits-vegetables', '🍎', true),
  ('6', 'Milk', 'Full cream fresh milk', 68, 60, 'litre', 'dairy-eggs', '🥛', true),
  ('7', 'Curd', 'Homemade style curd', 55, 45, '500g', 'dairy-eggs', '🫙', true),
  ('8', 'Bread', 'Soft sandwich bread', 50, 40, 'pack', 'bakery', '🍞', true),
  ('9', 'Biscuits', 'Assorted tea-time biscuits', 40, 30, 'pack', 'snacks-beverages', '🍪', true),
  ('10', 'Mineral Water', '1L purified drinking water', 25, 20, 'bottle', 'snacks-beverages', '💧', true),
  ('11', 'Tea Powder', 'Strong blend tea powder', 140, 120, '250g', 'snacks-beverages', '🍵', true),
  ('12', 'Detergent', 'Washing powder for clothes', 100, 85, '1kg', 'home-care', '🧴', true)
on conflict (item_id) do update
set
  item_name = excluded.item_name,
  description = excluded.description,
  mrp = excluded.mrp,
  price = excluded.price,
  unit = excluded.unit,
  category_id = excluded.category_id,
  emoji = excluded.emoji,
  in_stock = excluded.in_stock;

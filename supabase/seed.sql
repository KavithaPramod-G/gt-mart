-- Seed categories and products for GT Mart
-- Run after 001_initial_schema.sql

insert into public.categories (id, label) values
  ('vegetables', 'Vegetables'),
  ('fruits', 'Fruits'),
  ('dairy', 'Dairy'),
  ('snacks', 'Snacks'),
  ('beverages', 'Beverages'),
  ('household', 'Household')
on conflict (id) do nothing;

insert into public.products (legacy_id, name, description, price, unit, category_id, emoji, in_stock) values
  ('1', 'Fresh Tomatoes', 'Locally sourced, ripe red tomatoes', 40, 'kg', 'vegetables', '🍅', true),
  ('2', 'Onions', 'Premium quality red onions', 35, 'kg', 'vegetables', '🧅', true),
  ('3', 'Potatoes', 'Farm fresh potatoes', 30, 'kg', 'vegetables', '🥔', true),
  ('4', 'Bananas', 'Sweet ripe bananas', 50, 'dozen', 'fruits', '🍌', true),
  ('5', 'Apples', 'Crisp Kashmiri apples', 180, 'kg', 'fruits', '🍎', true),
  ('6', 'Milk', 'Full cream fresh milk', 60, 'litre', 'dairy', '🥛', true),
  ('7', 'Curd', 'Homemade style curd', 45, '500g', 'dairy', '🫙', true),
  ('8', 'Bread', 'Soft sandwich bread', 40, 'pack', 'snacks', '🍞', true),
  ('9', 'Biscuits', 'Assorted tea-time biscuits', 30, 'pack', 'snacks', '🍪', true),
  ('10', 'Mineral Water', '1L purified drinking water', 20, 'bottle', 'beverages', '💧', true),
  ('11', 'Tea Powder', 'Strong blend tea powder', 120, '250g', 'beverages', '🍵', true),
  ('12', 'Detergent', 'Washing powder for clothes', 85, '1kg', 'household', '🧴', true)
on conflict (legacy_id) do update
set
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  unit = excluded.unit,
  category_id = excluded.category_id,
  emoji = excluded.emoji,
  in_stock = excluded.in_stock,
  updated_at = now();

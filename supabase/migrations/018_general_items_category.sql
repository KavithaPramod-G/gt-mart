-- Default category for products without a department (Excel import fallback)

insert into public.categories (id, label) values
  ('general-items', 'General Items')
on conflict (id) do update set label = excluded.label;

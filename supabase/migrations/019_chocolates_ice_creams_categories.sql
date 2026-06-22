-- Chocolates and ice creams categories

insert into public.categories (id, label) values
  ('chocolates', 'Chocolates'),
  ('ice-creams', 'Ice Creams')
on conflict (id) do update set label = excluded.label;

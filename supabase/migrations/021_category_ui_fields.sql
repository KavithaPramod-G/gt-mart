-- Category UI fields (emoji, colors, order) — single source of truth for mobile + admin

alter table public.categories
  add column if not exists emoji text not null default '🛒',
  add column if not exists tint text not null default '#F7F9F8',
  add column if not exists accent text not null default '#1B7A4E',
  add column if not exists blurb text not null default '',
  add column if not exists sort_order integer not null default 0,
  add column if not exists is_active boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

insert into public.categories (id, label, emoji, tint, accent, blurb, sort_order, is_active) values
  ('general-items', 'General Items', '📦', '#F7F9F8', '#5C6B63', 'General store items', 10, true),
  ('fruits-vegetables', 'Fruits & Vegetables', '🥬', '#E8F5EE', '#1B7A4E', 'Farm fresh', 20, true),
  ('dairy-eggs', 'Dairy & Eggs', '🥛', '#EEF4FF', '#3B6BB5', 'Daily essentials', 30, true),
  ('staples-grains', 'Staples & Grains', '🌾', '#FFF8E8', '#B8860B', 'Rice, flour & more', 40, true),
  ('oils-ghee', 'Oils & Ghee', '🫒', '#FFF0E8', '#C45C26', 'Cooking oils', 50, true),
  ('snacks-beverages', 'Snacks & Beverages', '🍿', '#F0FAF8', '#1A7A6E', 'Snacks & drinks', 60, true),
  ('chocolates', 'Chocolates', '🍫', '#FFF0E8', '#8B4513', 'Chocolates & treats', 70, true),
  ('ice-creams', 'Ice Creams', '🍦', '#EEF4FF', '#3B6BB5', 'Frozen desserts', 80, true),
  ('bakery', 'Bakery', '🍞', '#FFF8E8', '#B8860B', 'Fresh bakes', 90, true),
  ('instant-foods', 'Instant Foods', '🍜', '#EEF4FF', '#3B6BB5', 'Quick meals', 100, true),
  ('dry-fruits-nuts', 'Dry Fruits & Nuts', '🥜', '#FFF0E8', '#C45C26', 'Nuts & dry fruits', 110, true),
  ('personal-care', 'Personal Care', '🧴', '#F3F0FF', '#6B4FA0', 'Self care', 120, true),
  ('home-care', 'Home Care', '🧽', '#E8F5EE', '#1B7A4E', 'Clean & fresh', 130, true),
  ('baby-care', 'Baby Care', '🍼', '#EEF4FF', '#3B6BB5', 'For little ones', 140, true),
  ('pet-care', 'Pet Care', '🐾', '#FFF8E8', '#B8860B', 'Pet essentials', 150, true)
on conflict (id) do update set
  label = excluded.label,
  emoji = excluded.emoji,
  tint = excluded.tint,
  accent = excluded.accent,
  blurb = excluded.blurb,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();

create or replace function public.set_categories_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists categories_updated_at on public.categories;

create trigger categories_updated_at
  before update on public.categories
  for each row
  execute function public.set_categories_updated_at();

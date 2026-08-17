-- Parent category sections for mobile home screen (Flipkart-style grouping)

create table if not exists public.category_parent_groups (
  id text primary key,
  label text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.categories
  add column if not exists parent_group_id text references public.category_parent_groups (id) on delete set null;

insert into public.category_parent_groups (id, label, sort_order, is_active) values
  ('grocery', 'Grocery', 10, true),
  ('snacks-drinks', 'Snacks & Drinks', 20, true),
  ('beauty-personal-care', 'Beauty & Personal Care', 30, true),
  ('home-baby-pet', 'Home, Baby & Pet', 40, true)
on conflict (id) do update set
  label = excluded.label,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();

update public.categories set parent_group_id = 'grocery' where id in (
  'general-items',
  'fruits-vegetables',
  'dairy-eggs',
  'staples-grains',
  'oils-ghee',
  'dry-fruits-nuts',
  'instant-foods'
);

update public.categories set parent_group_id = 'snacks-drinks' where id in (
  'snacks-beverages',
  'chocolates',
  'ice-creams',
  'bakery'
);

update public.categories set parent_group_id = 'beauty-personal-care' where id = 'personal-care';

update public.categories set parent_group_id = 'home-baby-pet' where id in (
  'home-care',
  'baby-care',
  'pet-care'
);

create or replace function public.set_category_parent_groups_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists category_parent_groups_updated_at on public.category_parent_groups;

create trigger category_parent_groups_updated_at
  before update on public.category_parent_groups
  for each row
  execute function public.set_category_parent_groups_updated_at();

alter table public.category_parent_groups enable row level security;

create policy "category_parent_groups_public_read"
  on public.category_parent_groups for select
  using (is_active = true);

grant select on public.category_parent_groups to anon, authenticated;

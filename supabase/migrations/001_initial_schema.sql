-- GT Mart — initial database schema (Supabase / PostgreSQL)
-- Run in Supabase SQL Editor or via: supabase db push

create extension if not exists "pgcrypto";

create type public.order_status as enum (
  'placed',
  'confirmed',
  'preparing',
  'out_for_delivery',
  'delivered'
);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.categories (
  id text primary key,
  label text not null
);

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  name text not null default '',
  address_line text,
  landmark text,
  whatsapp_updates_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  name text not null,
  description text not null default '',
  price numeric(10, 2) not null check (price >= 0),
  unit text not null,
  category_id text not null references public.categories (id),
  emoji text not null default '🛒',
  in_stock boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  profile_id uuid references public.profiles (id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  address_line text not null,
  landmark text,
  subtotal numeric(10, 2) not null,
  delivery_fee numeric(10, 2) not null,
  total numeric(10, 2) not null,
  payment_method text not null default 'cod',
  status public.order_status not null default 'placed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_legacy_id text,
  name text not null,
  price numeric(10, 2) not null,
  quantity integer not null check (quantity > 0),
  unit text not null
);

create table public.order_notifications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  status public.order_status not null,
  message text not null,
  sent_at timestamptz not null default now()
);

create table public.order_number_counters (
  order_date date primary key,
  counter integer not null default 0
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create or replace function public.generate_order_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := current_date;
  next_counter integer;
begin
  insert into public.order_number_counters (order_date, counter)
  values (today, 1)
  on conflict (order_date) do update
  set counter = public.order_number_counters.counter + 1
  returning counter into next_counter;

  return 'GT-' || to_char(today, 'YYYYMMDD') || '-' || lpad(next_counter::text, 4, '0');
end;
$$;

create or replace function public.upsert_profile(
  p_phone text,
  p_name text default '',
  p_address_line text default null,
  p_landmark text default null,
  p_whatsapp_updates_enabled boolean default true
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.profiles;
begin
  insert into public.profiles (
    phone,
    name,
    address_line,
    landmark,
    whatsapp_updates_enabled
  )
  values (
    p_phone,
    coalesce(p_name, ''),
    p_address_line,
    p_landmark,
    coalesce(p_whatsapp_updates_enabled, true)
  )
  on conflict (phone) do update
  set
    name = coalesce(excluded.name, profiles.name),
    address_line = coalesce(excluded.address_line, profiles.address_line),
    landmark = coalesce(excluded.landmark, profiles.landmark),
    whatsapp_updates_enabled = coalesce(
      excluded.whatsapp_updates_enabled,
      profiles.whatsapp_updates_enabled
    ),
    updated_at = now()
  returning * into result;

  return result;
end;
$$;

create or replace function public.place_order(
  p_profile_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_address_line text,
  p_landmark text,
  p_subtotal numeric,
  p_delivery_fee numeric,
  p_total numeric,
  p_items jsonb,
  p_initial_message text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_order_number text;
  v_item jsonb;
begin
  v_order_number := public.generate_order_number();

  insert into public.orders (
    order_number,
    profile_id,
    customer_name,
    customer_phone,
    address_line,
    landmark,
    subtotal,
    delivery_fee,
    total,
    payment_method,
    status
  )
  values (
    v_order_number,
    p_profile_id,
    p_customer_name,
    p_customer_phone,
    p_address_line,
    p_landmark,
    p_subtotal,
    p_delivery_fee,
    p_total,
    'cod',
    'placed'
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.order_items (
      order_id,
      product_id,
      product_legacy_id,
      name,
      price,
      quantity,
      unit
    )
    values (
      v_order_id,
      nullif(v_item->>'product_id', '')::uuid,
      v_item->>'product_legacy_id',
      v_item->>'name',
      (v_item->>'price')::numeric,
      (v_item->>'quantity')::integer,
      v_item->>'unit'
    );
  end loop;

  insert into public.order_notifications (order_id, status, message)
  values (v_order_id, 'placed', p_initial_message);

  return v_order_id;
end;
$$;

create or replace function public.update_order_status(
  p_order_id uuid,
  p_status public.order_status,
  p_message text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders
  set status = p_status, updated_at = now()
  where id = p_order_id;

  insert into public.order_notifications (order_id, status, message)
  values (p_order_id, p_status, p_message);
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security (MVP — tighten with Supabase Auth in production)
-- ---------------------------------------------------------------------------

alter table public.categories enable row level security;
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_notifications enable row level security;
alter table public.order_number_counters enable row level security;
-- No policies on order_number_counters — only generate_order_number() (security definer) uses it.

create policy "categories_public_read"
  on public.categories for select
  using (true);

create policy "products_public_read"
  on public.products for select
  using (true);

create policy "profiles_public_read"
  on public.profiles for select
  using (true);

create policy "profiles_public_insert"
  on public.profiles for insert
  with check (true);

create policy "profiles_public_update"
  on public.profiles for update
  using (true);

create policy "orders_public_read"
  on public.orders for select
  using (true);

create policy "orders_public_insert"
  on public.orders for insert
  with check (true);

create policy "orders_public_update"
  on public.orders for update
  using (true);

create policy "order_items_public_read"
  on public.order_items for select
  using (true);

create policy "order_items_public_insert"
  on public.order_items for insert
  with check (true);

create policy "order_notifications_public_read"
  on public.order_notifications for select
  using (true);

create policy "order_notifications_public_insert"
  on public.order_notifications for insert
  with check (true);

grant usage on schema public to anon, authenticated;
grant select on public.categories, public.products, public.orders,
  public.order_items, public.order_notifications, public.profiles to anon, authenticated;
grant insert, update on public.profiles, public.orders,
  public.order_items, public.order_notifications to anon, authenticated;
grant execute on function public.generate_order_number() to anon, authenticated;
grant execute on function public.upsert_profile(text, text, text, text, boolean) to anon, authenticated;
grant execute on function public.place_order(uuid, text, text, text, text, numeric, numeric, numeric, jsonb, text) to anon, authenticated;
grant execute on function public.update_order_status(uuid, public.order_status, text) to anon, authenticated;

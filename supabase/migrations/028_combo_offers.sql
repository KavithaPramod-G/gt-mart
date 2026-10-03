-- Festival combo offers.
-- Adds tables only. Does not change existing product prices or delete rows.
-- A product stays in its category. The combo stores the same product id plus a quantity.
-- The discount is the combo price, not a change to products.price.

create table if not exists public.combo_offers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  event_tag text,
  emoji text not null default '🎁',
  combo_price numeric(10, 2) not null check (combo_price >= 0),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.combo_offer_items (
  id uuid primary key default gen_random_uuid(),
  combo_id uuid not null references public.combo_offers (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  sort_order integer not null default 0,
  unique (combo_id, product_id)
);

alter table public.order_items
  add column if not exists combo_offer_id uuid references public.combo_offers (id) on delete set null;

alter table public.order_items
  add column if not exists details text;

comment on column public.order_items.details is
  'Included products when this line is a combo pack.';

drop trigger if exists combo_offers_set_updated_at on public.combo_offers;

create trigger combo_offers_set_updated_at
  before update on public.combo_offers
  for each row execute function public.set_updated_at();

alter table public.combo_offers enable row level security;
alter table public.combo_offer_items enable row level security;

drop policy if exists "combo_offers_public_read" on public.combo_offers;
create policy "combo_offers_public_read"
  on public.combo_offers for select
  using (active = true);

drop policy if exists "combo_offer_items_public_read" on public.combo_offer_items;
create policy "combo_offer_items_public_read"
  on public.combo_offer_items for select
  using (
    exists (
      select 1
      from public.combo_offers c
      where c.id = combo_id
        and c.active = true
    )
  );

grant select on public.combo_offers, public.combo_offer_items to anon, authenticated;

-- place_order: product lines keep catalog price; combo lines use combo_offers.combo_price.
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
  p_initial_message text,
  p_payment_method text default 'cod'
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
  v_product record;
  v_combo public.combo_offers;
  v_product_id uuid;
  v_combo_id uuid;
  v_item_id text;
  v_quantity integer;
  v_unit_price numeric;
  v_details text;
  v_computed_subtotal numeric := 0;
  v_computed_total numeric;
  v_customer_phone text;
  v_payment_method text;
begin
  v_customer_phone := public.normalize_phone(p_customer_phone);
  v_payment_method := lower(trim(coalesce(p_payment_method, 'cod')));

  if length(v_customer_phone) <> 12 then
    raise exception 'Invalid customer phone';
  end if;

  if v_payment_method not in ('cod', 'upi') then
    raise exception 'Invalid payment method';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Order must include at least one item';
  end if;

  if p_delivery_fee < 0 then
    raise exception 'Invalid delivery fee';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Invalid item quantity';
    end if;

    v_combo_id := nullif(v_item->>'combo_id', '')::uuid;

    if v_combo_id is not null then
      select *
      into v_combo
      from public.combo_offers
      where id = v_combo_id
        and active = true;

      if not found then
        raise exception 'Combo not available';
      end if;

      if not exists (
        select 1 from public.combo_offer_items where combo_id = v_combo.id
      ) then
        raise exception 'Combo has no products';
      end if;

      if exists (
        select 1
        from public.combo_offer_items ci
        join public.products p on p.id = ci.product_id
        where ci.combo_id = v_combo.id
          and p.in_stock = false
      ) then
        raise exception 'A product in this combo is out of stock';
      end if;

      v_computed_subtotal := v_computed_subtotal + (v_combo.combo_price * v_quantity);
      continue;
    end if;

    v_product_id := nullif(v_item->>'product_id', '')::uuid;
    v_item_id := nullif(trim(v_item->>'product_legacy_id'), '');

    select *
    into v_product
    from public.products
    where in_stock = true
      and (
        (v_product_id is not null and id = v_product_id)
        or (v_item_id is not null and item_id = v_item_id)
      )
    limit 1;

    if not found then
      raise exception 'Product not found or out of stock';
    end if;

    v_unit_price := v_product.price;
    v_computed_subtotal := v_computed_subtotal + (v_unit_price * v_quantity);
  end loop;

  v_computed_total := v_computed_subtotal + p_delivery_fee;
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
    payment_status,
    status
  )
  values (
    v_order_number,
    p_profile_id,
    trim(p_customer_name),
    v_customer_phone,
    trim(p_address_line),
    nullif(trim(p_landmark), ''),
    v_computed_subtotal,
    p_delivery_fee,
    v_computed_total,
    v_payment_method,
    'pending',
    'placed'
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item->>'quantity')::integer;
    v_combo_id := nullif(v_item->>'combo_id', '')::uuid;

    if v_combo_id is not null then
      select *
      into v_combo
      from public.combo_offers
      where id = v_combo_id
        and active = true;

      select string_agg(
        p.item_name || ' × ' || ci.quantity::text,
        ', ' order by ci.sort_order, p.item_name
      )
      into v_details
      from public.combo_offer_items ci
      join public.products p on p.id = ci.product_id
      where ci.combo_id = v_combo.id;

      insert into public.order_items (
        order_id,
        product_id,
        product_legacy_id,
        name,
        price,
        quantity,
        unit,
        combo_offer_id,
        details
      )
      values (
        v_order_id,
        null,
        null,
        v_combo.title,
        v_combo.combo_price,
        v_quantity,
        'pack',
        v_combo.id,
        v_details
      );

      continue;
    end if;

    v_product_id := nullif(v_item->>'product_id', '')::uuid;
    v_item_id := nullif(trim(v_item->>'product_legacy_id'), '');

    select *
    into v_product
    from public.products
    where in_stock = true
      and (
        (v_product_id is not null and id = v_product_id)
        or (v_item_id is not null and item_id = v_item_id)
      )
    limit 1;

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
      v_product.id,
      v_product.item_id,
      v_product.item_name,
      v_product.price,
      v_quantity,
      v_product.unit
    );
  end loop;

  insert into public.order_notifications (order_id, status, message)
  values (v_order_id, 'placed', p_initial_message);

  return v_order_id;
end;
$$;

create or replace function public.order_to_json(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_items jsonb;
  v_notifications jsonb;
begin
  select * into v_order from public.orders where id = p_order_id;
  if not found then
    return null;
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'product_legacy_id', product_legacy_id,
      'product_id', product_id,
      'name', name,
      'price', price,
      'quantity', quantity,
      'unit', unit,
      'details', details
    )
  ), '[]'::jsonb)
  into v_items
  from public.order_items
  where order_id = p_order_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'status', status,
      'message', message,
      'status_note', status_note,
      'sent_at', sent_at
    ) order by sent_at
  ), '[]'::jsonb)
  into v_notifications
  from public.order_notifications
  where order_id = p_order_id;

  return jsonb_build_object(
    'id', v_order.id,
    'order_number', v_order.order_number,
    'profile_id', v_order.profile_id,
    'customer_name', v_order.customer_name,
    'customer_phone', v_order.customer_phone,
    'address_line', v_order.address_line,
    'landmark', v_order.landmark,
    'subtotal', v_order.subtotal,
    'delivery_fee', v_order.delivery_fee,
    'total', v_order.total,
    'payment_method', v_order.payment_method,
    'payment_status', coalesce(v_order.payment_status, 'pending'),
    'payment_note', v_order.payment_note,
    'payment_verified_at', v_order.payment_verified_at,
    'payment_proof_url', v_order.payment_proof_url,
    'payment_upi_reference', v_order.payment_upi_reference,
    'status', v_order.status,
    'created_at', v_order.created_at,
    'updated_at', v_order.updated_at,
    'items', v_items,
    'notifications', v_notifications
  );
end;
$$;

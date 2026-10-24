-- Offer shelves bill MRP. Category lines keep products.price.
-- A line is an offer line only when the app sends price_basis = mrp
-- and the product is on Buy 1 Get 1 or an active Offers & news post.

create or replace function public.offer_shelf_unit_price(
  p_product_id uuid,
  p_price numeric,
  p_mrp numeric,
  p_price_basis text
)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tag text;
begin
  if coalesce(p_price_basis, '') <> 'mrp' or coalesce(p_mrp, 0) <= 0 or p_mrp < p_price then
    return p_price;
  end if;

  begin
    execute 'select offer_tag from public.products where id = $1'
      into v_tag
      using p_product_id;
  exception
    when undefined_column then
      v_tag := null;
  end;

  if v_tag = 'bogo' then
    return p_mrp;
  end if;

  if to_regclass('public.shop_announcement_products') is not null
     and to_regclass('public.shop_announcements') is not null
     and exists (
       select 1
       from public.shop_announcement_products sap
       join public.shop_announcements sa on sa.id = sap.announcement_id
       where sap.product_id = p_product_id
         and sa.active = true
     ) then
    return p_mrp;
  end if;

  return p_price;
end;
$$;

revoke all on function public.offer_shelf_unit_price(uuid, numeric, numeric, text) from public;
grant execute on function public.offer_shelf_unit_price(uuid, numeric, numeric, text) to postgres, service_role;

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

    v_unit_price := public.offer_shelf_unit_price(
      v_product.id,
      v_product.price,
      v_product.mrp,
      v_item->>'price_basis'
    );
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

    v_unit_price := public.offer_shelf_unit_price(
      v_product.id,
      v_product.price,
      v_product.mrp,
      v_item->>'price_basis'
    );

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
      v_unit_price,
      v_quantity,
      v_product.unit
    );
  end loop;

  insert into public.order_notifications (order_id, status, message)
  values (v_order_id, 'placed', p_initial_message);

  return v_order_id;
end;
$$;


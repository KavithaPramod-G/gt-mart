-- Razorpay UPI payment links.
-- Additive on top of 035 place_order (combo price, offer shelf MRP, out-of-stock rejection).
-- Do not apply the old stashed 028_razorpay_payments.sql. That file replaces place_order
-- with a pre-combo version and collides with 028_combo_offers.sql.
-- The customer app never marks an order paid. Only verify_razorpay_order_payment,
-- granted to service_role, may set payment_status to verified for razorpay orders.

alter table public.orders
  add column if not exists razorpay_payment_link_id text;

alter table public.orders
  add column if not exists razorpay_payment_link_url text;

alter table public.orders
  add column if not exists razorpay_payment_link_expires_at timestamptz;

alter table public.orders
  add column if not exists razorpay_payment_id text;

comment on column public.orders.razorpay_payment_link_id is
  'Razorpay payment link id (plink_...) for hosted UPI checkout.';
comment on column public.orders.razorpay_payment_link_url is
  'Hosted Razorpay checkout URL opened from the app.';
comment on column public.orders.razorpay_payment_link_expires_at is
  'When the current Razorpay payment link expires.';
comment on column public.orders.razorpay_payment_id is
  'Captured Razorpay payment id (pay_...) after the webhook verifies the payment.';

create index if not exists orders_razorpay_payment_link_id_idx
  on public.orders (razorpay_payment_link_id)
  where razorpay_payment_link_id is not null;

alter table public.orders
  drop constraint if exists orders_payment_method_check;

alter table public.orders
  add constraint orders_payment_method_check
  check (payment_method in ('cod', 'upi', 'razorpay'));

-- Same signature the app already calls. Client totals are still ignored.
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

  if v_payment_method not in ('cod', 'upi', 'razorpay') then
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

grant execute on function public.place_order(
  uuid, text, text, text, text, numeric, numeric, numeric, jsonb, text, text
) to anon, authenticated;

create or replace function public.verify_razorpay_order_payment(
  p_order_id uuid,
  p_payment_link_id text,
  p_payment_id text,
  p_amount_paise integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_expected_paise integer;
begin
  select * into v_order from public.orders where id = p_order_id;
  if not found then
    raise exception 'Order not found';
  end if;

  if v_order.payment_method <> 'razorpay' then
    raise exception 'Order is not a Razorpay payment';
  end if;

  if v_order.status = 'cancelled' then
    raise exception 'Cancelled order cannot be marked paid';
  end if;

  v_expected_paise := round(v_order.total * 100)::integer;
  if p_amount_paise is null or p_amount_paise <> v_expected_paise then
    raise exception 'Payment amount does not match order total';
  end if;

  if v_order.payment_status = 'verified' then
    return true;
  end if;

  update public.orders
  set
    payment_status = 'verified',
    payment_verified_at = coalesce(payment_verified_at, now()),
    razorpay_payment_link_id = coalesce(nullif(trim(p_payment_link_id), ''), razorpay_payment_link_id),
    razorpay_payment_id = coalesce(nullif(trim(p_payment_id), ''), razorpay_payment_id),
    updated_at = now()
  where id = p_order_id;

  return true;
end;
$$;

revoke all on function public.verify_razorpay_order_payment(uuid, text, text, integer) from public;
revoke all on function public.verify_razorpay_order_payment(uuid, text, text, integer) from anon;
revoke all on function public.verify_razorpay_order_payment(uuid, text, text, integer) from authenticated;
grant execute on function public.verify_razorpay_order_payment(uuid, text, text, integer) to service_role;

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
    'razorpay_payment_link_url', v_order.razorpay_payment_link_url,
    'razorpay_payment_id', v_order.razorpay_payment_id,
    'status', v_order.status,
    'created_at', v_order.created_at,
    'updated_at', v_order.updated_at,
    'items', v_items,
    'notifications', v_notifications
  );
end;
$$;

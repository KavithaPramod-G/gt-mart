-- Security hardening: tighten RLS, validate order prices, session-scoped customer APIs.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_valid_customer_session(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.customer_sessions
    where id = p_session_id
      and revoked_at is null
      and expires_at > now()
  );
$$;

create or replace function public.profile_id_for_session(p_session_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select profile_id
  from public.customer_sessions
  where id = p_session_id
    and revoked_at is null
    and expires_at > now();
$$;

-- ---------------------------------------------------------------------------
-- place_order: server-side price validation (ignore client totals)
-- ---------------------------------------------------------------------------

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
  v_product record;
  v_product_id uuid;
  v_item_id text;
  v_quantity integer;
  v_unit_price numeric;
  v_computed_subtotal numeric := 0;
  v_computed_total numeric;
  v_customer_phone text;
begin
  v_customer_phone := public.normalize_phone(p_customer_phone);

  if length(v_customer_phone) <> 12 then
    raise exception 'Invalid customer phone';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Order must include at least one item';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := nullif(v_item->>'product_id', '')::uuid;
    v_item_id := nullif(trim(v_item->>'product_legacy_id'), '');
    v_quantity := (v_item->>'quantity')::integer;

    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Invalid item quantity';
    end if;

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

  if p_delivery_fee < 0 then
    raise exception 'Invalid delivery fee';
  end if;

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
    trim(p_customer_name),
    v_customer_phone,
    trim(p_address_line),
    nullif(trim(p_landmark), ''),
    v_computed_subtotal,
    p_delivery_fee,
    v_computed_total,
    'cod',
    'placed'
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := nullif(v_item->>'product_id', '')::uuid;
    v_item_id := nullif(trim(v_item->>'product_legacy_id'), '');
    v_quantity := (v_item->>'quantity')::integer;

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

-- ---------------------------------------------------------------------------
-- Order JSON helper (used by customer order RPCs)
-- ---------------------------------------------------------------------------

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
      'unit', unit
    )
  ), '[]'::jsonb)
  into v_items
  from public.order_items
  where order_id = p_order_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'status', status,
      'message', message,
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
    'status', v_order.status,
    'created_at', v_order.created_at,
    'updated_at', v_order.updated_at,
    'items', v_items,
    'notifications', v_notifications
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Customer order reads (session or phone + order id)
-- ---------------------------------------------------------------------------

create or replace function public.get_customer_orders(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
  v_orders jsonb;
begin
  if not public.is_valid_customer_session(p_session_id) then
    return '[]'::jsonb;
  end if;

  select phone into v_phone
  from public.customer_sessions
  where id = p_session_id;

  select coalesce(
    jsonb_agg(public.order_to_json(o.id) order by o.created_at desc),
    '[]'::jsonb
  )
  into v_orders
  from public.orders o
  where o.customer_phone = v_phone;

  return v_orders;
end;
$$;

create or replace function public.get_customer_order(
  p_phone text,
  p_order_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
begin
  v_phone := public.normalize_phone(p_phone);

  if not exists (
    select 1 from public.orders
    where id = p_order_id and customer_phone = v_phone
  ) then
    return null;
  end if;

  return public.order_to_json(p_order_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Profile update (session required)
-- ---------------------------------------------------------------------------

create or replace function public.update_customer_profile(
  p_session_id uuid,
  p_name text,
  p_address_line text,
  p_landmark text,
  p_whatsapp_updates_enabled boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
  v_profile public.profiles;
begin
  if not public.is_valid_customer_session(p_session_id) then
    return jsonb_build_object('success', false, 'message', 'Session expired. Please log in again.');
  end if;

  select phone into v_phone
  from public.customer_sessions
  where id = p_session_id;

  v_profile := public.upsert_profile(
    v_phone,
    coalesce(trim(p_name), ''),
    nullif(trim(p_address_line), ''),
    nullif(trim(p_landmark), ''),
    coalesce(p_whatsapp_updates_enabled, true)
  );

  return jsonb_build_object(
    'success', true,
    'profile', public.profile_to_json(v_profile)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- OTP: never expose OTP in API response
-- ---------------------------------------------------------------------------

create or replace function public.request_customer_otp(p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_phone text;
  v_recent_count integer;
  v_otp text;
  v_expires_at timestamptz;
begin
  v_phone := public.normalize_phone(p_phone);

  if length(v_phone) <> 12 or substring(v_phone, 3, 1) not in ('6', '7', '8', '9') then
    return jsonb_build_object('success', false, 'message', 'Enter a valid 10-digit mobile number.');
  end if;

  select count(*) into v_recent_count
  from public.otp_verifications
  where phone = v_phone
    and created_at > now() - interval '10 minutes';

  if v_recent_count >= 3 then
    return jsonb_build_object(
      'success', false,
      'message', 'Too many OTP requests. Please wait and try again.'
    );
  end if;

  v_otp := lpad(floor(random() * 1000000)::text, 6, '0');
  v_expires_at := now() + interval '5 minutes';

  insert into public.otp_verifications (phone, otp_hash, expires_at)
  values (v_phone, public.hash_customer_otp(v_phone, v_otp), v_expires_at);

  return jsonb_build_object(
    'success', true,
    'message', 'OTP sent to your mobile number.',
    'expires_in_seconds', 300
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Logout: require matching phone
-- ---------------------------------------------------------------------------

create or replace function public.revoke_customer_session(
  p_session_id uuid,
  p_phone text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
begin
  if p_session_id is null then
    return jsonb_build_object('success', true);
  end if;

  v_phone := public.normalize_phone(p_phone);

  update public.customer_sessions
  set revoked_at = now()
  where id = p_session_id
    and phone = v_phone
    and revoked_at is null;

  return jsonb_build_object('success', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin login brute-force: revoke public RPC access (admin uses service role)
-- ---------------------------------------------------------------------------

revoke execute on function public.verify_admin_login(text, text) from anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS: drop overly permissive policies
-- ---------------------------------------------------------------------------

drop policy if exists "profiles_public_read" on public.profiles;
drop policy if exists "profiles_public_insert" on public.profiles;
drop policy if exists "profiles_public_update" on public.profiles;
drop policy if exists "orders_public_read" on public.orders;
drop policy if exists "orders_public_insert" on public.orders;
drop policy if exists "orders_public_update" on public.orders;
drop policy if exists "order_items_public_read" on public.order_items;
drop policy if exists "order_items_public_insert" on public.order_items;
drop policy if exists "order_notifications_public_read" on public.order_notifications;
drop policy if exists "order_notifications_public_insert" on public.order_notifications;
drop policy if exists "products_public_read" on public.products;

create policy "products_public_read_in_stock"
  on public.products for select
  using (in_stock = true);

-- ---------------------------------------------------------------------------
-- Revoke direct table writes / reads for sensitive data
-- ---------------------------------------------------------------------------

revoke insert, update, delete on public.profiles from anon, authenticated;
revoke insert, update, delete on public.orders from anon, authenticated;
revoke select on public.orders from anon, authenticated;
revoke insert, update, delete on public.order_items from anon, authenticated;
revoke select on public.order_items from anon, authenticated;
revoke insert, update, delete on public.order_notifications from anon, authenticated;
revoke select on public.order_notifications from anon, authenticated;
revoke select on public.profiles from anon, authenticated;

revoke execute on function public.update_order_status(uuid, public.order_status, text) from anon, authenticated;
revoke execute on function public.upsert_profile(text, text, text, text, boolean) from anon, authenticated;

-- Drop old OTP / session function signatures
drop function if exists public.request_customer_otp(text, boolean);
drop function if exists public.revoke_customer_session(uuid);

grant execute on function public.update_order_status(uuid, public.order_status, text) to service_role;

grant execute on function public.place_order(
  uuid, text, text, text, text, numeric, numeric, numeric, jsonb, text
) to anon, authenticated;
grant execute on function public.get_customer_orders(uuid) to anon, authenticated;
grant execute on function public.get_customer_order(text, uuid) to anon, authenticated;
grant execute on function public.update_customer_profile(
  uuid, text, text, text, boolean
) to anon, authenticated;
grant execute on function public.request_customer_otp(text) to anon, authenticated;
grant execute on function public.revoke_customer_session(uuid, text) to anon, authenticated;

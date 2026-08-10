-- Online UPI payment (GPay / PhonePe) + customer payment screenshot upload.

alter table public.orders
  add column if not exists payment_proof_url text;

alter table public.orders
  add column if not exists payment_upi_reference text;

alter table public.orders
  drop constraint if exists orders_payment_method_check;

alter table public.orders
  add constraint orders_payment_method_check
  check (payment_method in ('cod', 'upi'));

comment on column public.orders.payment_proof_url is
  'Public URL of customer-uploaded UPI payment screenshot.';
comment on column public.orders.payment_upi_reference is
  'Optional UPI transaction reference entered by customer.';

-- Payment proof screenshots (public read for admin; customers upload via anon key).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs',
  'payment-proofs',
  true,
  5242880,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "payment_proofs_public_read" on storage.objects;
drop policy if exists "payment_proofs_customer_insert" on storage.objects;

create policy "payment_proofs_public_read"
  on storage.objects for select
  using (bucket_id = 'payment-proofs');

create policy "payment_proofs_customer_insert"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1] = 'orders'
  );

-- place_order: accept payment method (cod | upi).
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
  v_product_id uuid;
  v_item_id text;
  v_quantity integer;
  v_unit_price numeric;
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

grant execute on function public.place_order(
  uuid, text, text, text, text, numeric, numeric, numeric, jsonb, text, text
) to anon, authenticated;

-- Customer attaches uploaded proof URL to their order.
create or replace function public.submit_order_payment_proof(
  p_order_id uuid,
  p_phone text,
  p_proof_url text,
  p_upi_reference text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
begin
  v_phone := public.normalize_phone(p_phone);

  if p_proof_url is null or length(trim(p_proof_url)) < 10 then
    raise exception 'Invalid payment proof URL';
  end if;

  update public.orders
  set
    payment_proof_url = trim(p_proof_url),
    payment_upi_reference = nullif(trim(p_upi_reference), ''),
    payment_status = 'pending',
    updated_at = now()
  where id = p_order_id
    and customer_phone = v_phone
    and payment_method = 'upi';

  if not found then
    raise exception 'Order not found or not eligible for UPI proof';
  end if;
end;
$$;

grant execute on function public.submit_order_payment_proof(uuid, text, text, text)
  to anon, authenticated;

-- Extend order JSON for mobile reads.
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

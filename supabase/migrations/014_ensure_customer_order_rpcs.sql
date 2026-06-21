-- Ensure customer order RPCs exist (from 008). Safe to run if 008 was skipped.

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

grant execute on function public.get_customer_orders(uuid) to anon, authenticated;
grant execute on function public.get_customer_order(text, uuid) to anon, authenticated;

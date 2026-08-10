-- Optional shop note per status change (cancel reason, delivery notes, etc.)

alter table public.order_notifications
  add column if not exists status_note text;

comment on column public.order_notifications.status_note is
  'Optional shop note for this status change (e.g. cancel reason). Visible to customer in order history.';

create or replace function public.update_order_status(
  p_order_id uuid,
  p_status public.order_status,
  p_message text,
  p_status_note text default null
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

  insert into public.order_notifications (order_id, status, message, status_note)
  values (p_order_id, p_status, p_message, nullif(trim(p_status_note), ''));
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

-- Customer order COD payment verification (admin marks cash received).

alter table public.orders
  add column if not exists payment_status text not null default 'pending';

alter table public.orders
  drop constraint if exists orders_payment_status_check;

alter table public.orders
  add constraint orders_payment_status_check
  check (payment_status in ('pending', 'verified'));

alter table public.orders
  add column if not exists payment_note text;

alter table public.orders
  add column if not exists payment_verified_at timestamptz;

comment on column public.orders.payment_status is
  'COD payment: pending until shop verifies cash received on delivery.';
comment on column public.orders.payment_note is
  'Optional admin note about payment (e.g. partial cash, UPI instead).';
comment on column public.orders.payment_verified_at is
  'When payment was marked verified in admin.';

create index if not exists orders_payment_status_idx
  on public.orders (payment_status);

-- Include payment fields in customer order JSON.
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
    'status', v_order.status,
    'created_at', v_order.created_at,
    'updated_at', v_order.updated_at,
    'items', v_items,
    'notifications', v_notifications
  );
end;
$$;

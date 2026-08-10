-- Allow shop staff to cancel fake/test orders from admin.

alter type public.order_status add value if not exists 'cancelled';

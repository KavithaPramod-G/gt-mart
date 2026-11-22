import {
  amountToPaise,
  corsHeaders,
  getAdminClient,
  getRazorpayAuthHeader,
  jsonResponse,
  normalizePhone,
} from '../_shared/razorpay.ts';

interface RazorpayPaymentLink {
  id?: string;
  short_url?: string;
  expire_by?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ success: false, message: 'Method not allowed' }, 405);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const orderId = typeof body.order_id === 'string' ? body.order_id.trim() : '';
    const phone = normalizePhone(typeof body.phone === 'string' ? body.phone : '');

    if (!orderId || phone.length !== 12) {
      return jsonResponse({ success: false, message: 'Invalid order details.' }, 400);
    }

    const authHeader = getRazorpayAuthHeader();
    if (!authHeader) {
      return jsonResponse({
        success: false,
        message: 'UPI payment is not configured yet. Use cash on delivery or shop UPI.',
      }, 503);
    }

    const supabase = getAdminClient();
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(
        'id, order_number, customer_name, customer_phone, total, payment_method, payment_status, status, razorpay_payment_link_id, razorpay_payment_link_url, razorpay_payment_link_expires_at',
      )
      .eq('id', orderId)
      .eq('customer_phone', phone)
      .maybeSingle();

    if (orderError || !order) {
      return jsonResponse({ success: false, message: 'Order not found.' }, 404);
    }

    if (order.payment_method !== 'razorpay') {
      return jsonResponse({ success: false, message: 'This order is not a Razorpay payment.' }, 400);
    }

    if (order.status === 'cancelled') {
      return jsonResponse({ success: false, message: 'This order was cancelled.' }, 400);
    }

    if (order.payment_status === 'verified') {
      return jsonResponse({ success: true, already_paid: true });
    }

    const existingExpiry = order.razorpay_payment_link_expires_at
      ? new Date(order.razorpay_payment_link_expires_at).getTime()
      : 0;
    if (
      order.razorpay_payment_link_url &&
      existingExpiry > Date.now() + 5 * 60 * 1000
    ) {
      return jsonResponse({
        success: true,
        short_url: order.razorpay_payment_link_url,
      });
    }

    const amountPaise = amountToPaise(order.total);
    if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
      return jsonResponse({ success: false, message: 'This order has no payable amount.' }, 400);
    }

    const expireBy = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
    const referenceId = `${order.order_number}-${Date.now().toString(36)}`.slice(0, 40);
    const contact = phone.startsWith('91') ? `+${phone}` : phone;

    const razorpayResponse = await fetch('https://api.razorpay.com/v1/payment_links', {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        accept_partial: false,
        reference_id: referenceId,
        description: `RROne order ${order.order_number}`,
        customer: {
          name: order.customer_name,
          contact,
        },
        notify: { sms: false, email: false },
        reminder_enable: false,
        expire_by: expireBy,
        notes: {
          order_id: order.id,
          order_number: order.order_number,
        },
      }),
    });

    const payload = (await razorpayResponse.json().catch(() => ({}))) as RazorpayPaymentLink & {
      error?: { description?: string };
    };

    if (!razorpayResponse.ok || !payload.short_url || !payload.id) {
      console.error(
        '[create-razorpay-payment-link] Razorpay error:',
        payload.error?.description ?? razorpayResponse.status,
      );
      return jsonResponse({
        success: false,
        message: payload.error?.description ?? 'Could not create payment. Try again.',
      }, 502);
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        razorpay_payment_link_id: payload.id,
        razorpay_payment_link_url: payload.short_url,
        razorpay_payment_link_expires_at: new Date(expireBy * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (updateError) {
      console.error('[create-razorpay-payment-link] save link failed:', updateError.message);
    }

    return jsonResponse({
      success: true,
      short_url: payload.short_url,
    });
  } catch (error) {
    console.error('[create-razorpay-payment-link] unexpected error:', error);
    return jsonResponse({
      success: false,
      message: 'Unexpected server error.',
    }, 500);
  }
});

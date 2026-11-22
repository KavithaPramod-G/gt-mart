import {
  getAdminClient,
  markRazorpayOrderPaid,
  verifyRazorpayWebhookSignature,
} from '../_shared/razorpay.ts';

interface RazorpayWebhookPayload {
  event?: string;
  payload?: {
    payment_link?: {
      entity?: {
        id?: string;
        status?: string;
        amount_paid?: number;
        notes?: Record<string, string>;
      };
    };
    payment?: {
      entity?: {
        id?: string;
        amount?: number;
        status?: string;
        notes?: Record<string, string>;
      };
    };
  };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature');

  if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
    return new Response('Invalid signature', { status: 401 });
  }

  let event: RazorpayWebhookPayload;
  try {
    event = JSON.parse(rawBody) as RazorpayWebhookPayload;
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const paymentLink = event.payload?.payment_link?.entity;
  const payment = event.payload?.payment?.entity;
  const notedOrderId = paymentLink?.notes?.order_id || payment?.notes?.order_id || '';

  const isPaidEvent =
    event.event === 'payment_link.paid' ||
    (event.event === 'payment.captured' && payment?.status === 'captured');

  if (!isPaidEvent) {
    return new Response('ok', { status: 200 });
  }

  const amountPaise = Number(paymentLink?.amount_paid ?? payment?.amount);
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    return new Response('Payment amount missing', { status: 422 });
  }

  try {
    const supabase = getAdminClient();
    let resolvedOrderId = notedOrderId;

    if (!isUuid(resolvedOrderId) && paymentLink?.id) {
      const { data } = await supabase
        .from('orders')
        .select('id')
        .eq('razorpay_payment_link_id', paymentLink.id)
        .maybeSingle();
      if (data?.id) {
        resolvedOrderId = data.id;
      }
    }

    if (!isUuid(resolvedOrderId)) {
      return new Response('ok', { status: 200 });
    }

    const result = await markRazorpayOrderPaid(supabase, {
      orderId: resolvedOrderId,
      paymentLinkId: paymentLink?.id ?? null,
      paymentId: payment?.id ?? null,
      amountPaise,
    });

    if (!result.ok) {
      return new Response(result.message ?? 'Verify failed', { status: 422 });
    }
  } catch (error) {
    console.error('[razorpay-webhook] unexpected error:', error);
    return new Response('Server error', { status: 500 });
  }

  return new Response('ok', { status: 200 });
});

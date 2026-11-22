// Public redirect after Razorpay. No secrets and no payment update.
// The app marks an order paid only from the Razorpay webhook.

const ORDER_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve((req) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405 });
  }

  const orderId = new URL(req.url).searchParams.get('order_id')?.trim() ?? '';
  if (!ORDER_ID.test(orderId)) {
    return new Response('Unknown order', { status: 400 });
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: `gtmart://order/${orderId}?share=1`,
      'Cache-Control': 'no-store',
    },
  });
});

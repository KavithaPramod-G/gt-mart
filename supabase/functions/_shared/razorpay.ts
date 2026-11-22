import { createHmac, timingSafeEqual } from 'node:crypto';
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }
  return digits;
}

export function amountToPaise(total: number | string): number {
  return Math.round(Number(total) * 100);
}

export function getAdminClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase service role is not configured.');
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getRazorpayAuthHeader(): string | null {
  const keyId = Deno.env.get('RAZORPAY_KEY_ID')?.trim();
  const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')?.trim();
  if (!keyId || !keySecret) {
    return null;
  }
  return `Basic ${btoa(`${keyId}:${keySecret}`)}`;
}

export function verifyRazorpayWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')?.trim();
  if (!secret || !signature) {
    return false;
  }
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const expectedBytes = new TextEncoder().encode(expected);
  const signatureBytes = new TextEncoder().encode(signature.trim());
  if (expectedBytes.byteLength !== signatureBytes.byteLength) {
    return false;
  }
  return timingSafeEqual(expectedBytes, signatureBytes);
}

export async function markRazorpayOrderPaid(
  supabase: SupabaseClient,
  params: {
    orderId: string;
    paymentLinkId?: string | null;
    paymentId?: string | null;
    amountPaise: number;
  },
): Promise<{ ok: boolean; message?: string }> {
  const { error } = await supabase.rpc('verify_razorpay_order_payment', {
    p_order_id: params.orderId,
    p_payment_link_id: params.paymentLinkId ?? null,
    p_payment_id: params.paymentId ?? null,
    p_amount_paise: params.amountPaise,
  });

  if (error) {
    console.error('[razorpay] verify payment failed:', error.message);
    return { ok: false, message: error.message };
  }

  return { ok: true };
}

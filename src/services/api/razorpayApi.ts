import { getSupabase } from '@/lib/supabase';
import { normalizePhone } from '@/services/auth';

export interface RazorpayPaymentLinkResult {
  success: boolean;
  alreadyPaid?: boolean;
  shortUrl?: string;
  message?: string;
}

export async function createRazorpayPaymentLink(
  orderId: string,
  phone: string,
  returnUrl?: string,
): Promise<RazorpayPaymentLinkResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, message: 'Online payment is not configured.' };
  }

  const { data, error } = await supabase.functions.invoke('create-razorpay-payment-link', {
    body: {
      order_id: orderId,
      phone: normalizePhone(phone),
      return_url: returnUrl,
    },
  });

  if (error) {
    const message = await readFunctionError(error);
    console.warn('[razorpayApi] create link failed:', message);
    return {
      success: false,
      message,
    };
  }

  const result = data as {
    success?: boolean;
    already_paid?: boolean;
    short_url?: string;
    message?: string;
  } | null;

  if (!result?.success) {
    return {
      success: false,
      message: result?.message ?? 'Could not start UPI payment. Try again.',
    };
  }

  return {
    success: true,
    alreadyPaid: Boolean(result.already_paid),
    shortUrl: result.short_url,
    message: result.message,
  };
}

async function readFunctionError(error: { message?: string; context?: unknown }): Promise<string> {
  const fallback = error.message || 'Could not start UPI payment. Try again.';
  const context = error.context;
  if (!context || typeof context !== 'object' || !('json' in context)) {
    return fallback;
  }

  try {
    const body = (await (context as Response).clone().json()) as { message?: string };
    if (typeof body?.message === 'string' && body.message.trim()) {
      return body.message.trim();
    }
  } catch {
    // The function body was not JSON. Keep the client error text.
  }

  return fallback;
}

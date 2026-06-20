import { createHash } from 'node:crypto';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type SmsProvider = 'msg91' | 'twilio' | 'log';

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');

  if (digits.length === 10) {
    return `91${digits}`;
  }

  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }

  return digits;
}

function isValidIndianMobile(input: string): boolean {
  const phone = normalizePhone(input);
  return phone.length === 12 && /^91[6-9]\d{9}$/.test(phone);
}

function hashCustomerOtp(phone: string, otp: string): string {
  return createHash('sha256').update(`${otp.trim()}${normalizePhone(phone)}`).digest('hex');
}

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendSms(
  provider: SmsProvider,
  phone: string,
  otp: string,
): Promise<{ ok: boolean; message?: string }> {
  const normalized = normalizePhone(phone);

  if (provider === 'log') {
    console.log(`[send-customer-otp] OTP for ${normalized}: ${otp}`);
    return { ok: true };
  }

  if (provider === 'msg91') {
    const authKey = Deno.env.get('MSG91_AUTH_KEY')?.trim();
    const templateId = Deno.env.get('MSG91_TEMPLATE_ID')?.trim();

    if (!authKey || !templateId) {
      return { ok: false, message: 'MSG91 is not configured on the server.' };
    }

    const response = await fetch('https://control.msg91.com/api/v5/otp', {
      method: 'POST',
      headers: {
        authkey: authKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        template_id: templateId,
        mobile: normalized,
        otp,
        otp_expiry: 5,
      }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('[send-customer-otp] MSG91 error:', payload);
      return { ok: false, message: 'Could not send OTP SMS. Try again later.' };
    }

    if (payload.type === 'error') {
      console.error('[send-customer-otp] MSG91 error:', payload);
      return { ok: false, message: payload.message ?? 'Could not send OTP SMS.' };
    }

    return { ok: true };
  }

  if (provider === 'twilio') {
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')?.trim();
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')?.trim();
    const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER')?.trim();

    if (!accountSid || !authToken || !fromNumber) {
      return { ok: false, message: 'Twilio is not configured on the server.' };
    }

    const credentials = btoa(`${accountSid}:${authToken}`);
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: `+${normalized}`,
          From: fromNumber,
          Body: `Your GT Mart login OTP is ${otp}. Valid for 5 minutes. Do not share it with anyone.`,
        }),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      console.error('[send-customer-otp] Twilio error:', text);
      return { ok: false, message: 'Could not send OTP SMS. Try again later.' };
    }

    return { ok: true };
  }

  return { ok: false, message: 'SMS provider is not configured.' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ success: false, message: 'Method not allowed.' }, 405);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const phone = typeof body.phone === 'string' ? body.phone : '';

    if (!isValidIndianMobile(phone)) {
      return jsonResponse({
        success: false,
        message: 'Enter a valid 10-digit mobile number.',
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({
        success: false,
        message: 'Server configuration error.',
      }, 500);
    }

    const provider = (Deno.env.get('SMS_PROVIDER')?.trim().toLowerCase() ?? 'log') as SmsProvider;
    const otp = generateOtp();
    const otpHash = hashCustomerOtp(phone, otp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.rpc('store_customer_otp_hash', {
      p_phone: phone,
      p_otp_hash: otpHash,
      p_expires_at: expiresAt,
    });

    if (error) {
      console.error('[send-customer-otp] store hash failed:', error.message);
      return jsonResponse({
        success: false,
        message: 'Could not save OTP. Try again.',
      }, 500);
    }

    const result = data as {
      success?: boolean;
      message?: string;
      expires_in_seconds?: number;
    };

    if (!result?.success) {
      return jsonResponse({
        success: false,
        message: result?.message ?? 'Could not send OTP.',
      });
    }

    const smsResult = await sendSms(provider, phone, otp);
    if (!smsResult.ok) {
      return jsonResponse({
        success: false,
        message: smsResult.message ?? 'Could not send OTP SMS.',
      });
    }

    return jsonResponse({
      success: true,
      message: result.message ?? 'OTP sent to your mobile number.',
      expires_in_seconds: result.expires_in_seconds ?? 300,
    });
  } catch (error) {
    console.error('[send-customer-otp] unexpected error:', error);
    return jsonResponse({
      success: false,
      message: 'Unexpected server error.',
    }, 500);
  }
});

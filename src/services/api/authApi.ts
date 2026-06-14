import { getSupabase } from '@/lib/supabase';
import { isOtpDevMode } from '@/lib/env';
import { normalizePhone } from '@/services/auth';
import { UserProfile } from '@/types';

interface DbProfilePayload {
  id: string;
  phone: string;
  name: string;
  address_line: string | null;
  landmark: string | null;
  whatsapp_updates_enabled: boolean;
  created_at: string;
}

export interface OtpRequestResult {
  success: boolean;
  message: string;
  expiresInSeconds?: number;
  devOtp?: string;
}

export interface OtpVerifyResult {
  success: boolean;
  message: string;
  sessionId?: string;
  profile?: UserProfile;
}

export interface SessionValidationResult {
  valid: boolean;
  sessionId?: string;
  profile?: UserProfile;
}

function mapProfilePayload(payload: DbProfilePayload): UserProfile {
  return {
    id: payload.id,
    phone: payload.phone,
    name: payload.name,
    addressLine: payload.address_line ?? undefined,
    landmark: payload.landmark ?? undefined,
    whatsappUpdatesEnabled: payload.whatsapp_updates_enabled,
    createdAt: payload.created_at,
  };
}

export async function requestOtpFromDb(phone: string): Promise<OtpRequestResult | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('request_customer_otp', {
    p_phone: normalizePhone(phone),
    p_dev_mode: isOtpDevMode(),
  });

  if (error || !data) {
    console.warn('[authApi] request_otp failed:', error?.message);
    return {
      success: false,
      message: error?.message ?? 'Could not send OTP. Try again.',
    };
  }

  const result = data as {
    success: boolean;
    message: string;
    expires_in_seconds?: number;
    dev_otp?: string | null;
  };

  return {
    success: result.success,
    message: result.message,
    expiresInSeconds: result.expires_in_seconds,
    devOtp: result.dev_otp ?? undefined,
  };
}

export async function verifyOtpFromDb(
  phone: string,
  otp: string,
): Promise<OtpVerifyResult | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('verify_customer_otp', {
    p_phone: normalizePhone(phone),
    p_otp: otp.trim(),
  });

  if (error || !data) {
    console.warn('[authApi] verify_otp failed:', error?.message);
    return {
      success: false,
      message: error?.message ?? 'Could not verify OTP. Try again.',
    };
  }

  const result = data as {
    success: boolean;
    message: string;
    session_id?: string;
    profile?: DbProfilePayload;
  };

  return {
    success: result.success,
    message: result.message,
    sessionId: result.session_id,
    profile: result.profile ? mapProfilePayload(result.profile) : undefined,
  };
}

export async function validateSessionFromDb(
  sessionId: string,
): Promise<SessionValidationResult | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('validate_customer_session', {
    p_session_id: sessionId,
  });

  if (error || !data) {
    console.warn('[authApi] validate_session failed:', error?.message);
    return { valid: false };
  }

  const result = data as {
    valid: boolean;
    session_id?: string;
    profile?: DbProfilePayload;
  };

  return {
    valid: Boolean(result.valid),
    sessionId: result.session_id,
    profile: result.profile ? mapProfilePayload(result.profile) : undefined,
  };
}

export async function revokeSessionInDb(sessionId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { data, error } = await supabase.rpc('revoke_customer_session', {
    p_session_id: sessionId,
  });

  if (error) {
    console.warn('[authApi] revoke_session failed:', error?.message);
    return false;
  }

  return Boolean((data as { success?: boolean })?.success);
}

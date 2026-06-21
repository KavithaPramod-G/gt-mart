import { getSupabase } from '@/lib/supabase';
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

export interface AuthActionResult {
  success: boolean;
  message: string;
  sessionId?: string;
  profile?: UserProfile;
  alreadyRegistered?: boolean;
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

  const { data, error } = await supabase.functions.invoke('send-customer-otp', {
    body: { phone: normalizePhone(phone) },
  });

  if (error) {
    console.warn('[authApi] send-customer-otp failed:', error.message);
    return {
      success: false,
      message: error.message ?? 'Could not send OTP. Try again.',
    };
  }

  const result = data as {
    success?: boolean;
    message?: string;
    expires_in_seconds?: number;
  } | null;

  if (!result) {
    return {
      success: false,
      message: 'Could not send OTP. Try again.',
    };
  }

  return {
    success: Boolean(result.success),
    message: result.message ?? 'Could not send OTP. Try again.',
    expiresInSeconds: result.expires_in_seconds,
  };
}

export async function loginByPhoneFromDb(phone: string): Promise<AuthActionResult | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('login_customer_by_phone', {
    p_phone: normalizePhone(phone),
  });

  if (error || !data) {
    console.warn('[authApi] login_by_phone failed:', error?.message);
    return {
      success: false,
      message: error?.message ?? 'Could not log in. Try again.',
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

export async function registerCustomerFromDb(
  phone: string,
  password: string,
  name?: string,
): Promise<AuthActionResult | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('register_customer', {
    p_phone: phone,
    p_password: password,
    p_name: name?.trim() ?? '',
  });

  if (data) {
    return mapAuthActionResult(data);
  }

  if (error) {
    console.warn('[authApi] register_customer failed:', error.message);
    if (isDuplicateRegistrationError(error.message)) {
      return duplicateRegistrationMessage();
    }
    return {
      success: false,
      message: error.message ?? 'Could not create account. Try again.',
    };
  }

  return {
    success: false,
    message: 'Could not create account. Try again.',
  };
}

export async function loginCustomerFromDb(
  phone: string,
  password: string,
): Promise<AuthActionResult | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('login_customer', {
    p_phone: normalizePhone(phone),
    p_password: password,
  });

  if (error || !data) {
    console.warn('[authApi] login_customer failed:', error?.message);
    return {
      success: false,
      message: error?.message ?? 'Could not log in. Try again.',
    };
  }

  return mapAuthActionResult(data);
}

function mapAuthActionResult(data: unknown): AuthActionResult {
  const result = data as {
    success?: boolean;
    message?: string;
    session_id?: string;
    profile?: DbProfilePayload;
    already_registered?: boolean;
  };

  const message = result.message ?? 'Something went wrong. Try again.';
  const alreadyRegistered =
    Boolean(result.already_registered) ||
    /already registered/i.test(message);

  return {
    success: Boolean(result.success),
    message,
    sessionId: result.session_id,
    profile: result.profile ? mapProfilePayload(result.profile) : undefined,
    alreadyRegistered,
  };
}

function duplicateRegistrationMessage(): AuthActionResult {
  return {
    success: false,
    alreadyRegistered: true,
    message: 'This mobile number is already registered. Please log in.',
  };
}

function isDuplicateRegistrationError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('duplicate key') ||
    normalized.includes('profiles_phone') ||
    normalized.includes('already registered')
  );
}

export async function verifyOtpFromDb(
  phone: string,
  otp: string,
): Promise<AuthActionResult | null> {
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

export async function revokeSessionInDb(sessionId: string, phone: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { data, error } = await supabase.rpc('revoke_customer_session', {
    p_session_id: sessionId,
    p_phone: normalizePhone(phone),
  });

  if (error) {
    console.warn('[authApi] revoke_session failed:', error?.message);
    return false;
  }

  return Boolean((data as { success?: boolean })?.success);
}

function stripEnvValue(value: string | undefined): string {
  const trimmed = value?.trim() ?? '';
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function isValidSupabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export const env = {
  supabaseUrl: stripEnvValue(process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: stripEnvValue(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  otpDevMode: stripEnvValue(process.env.EXPO_PUBLIC_OTP_DEV_MODE).toLowerCase() === 'true',
  phoneOnlyAuth:
    stripEnvValue(process.env.EXPO_PUBLIC_PHONE_ONLY_AUTH).toLowerCase() === 'true',
};

export function isSupabaseConfigured(): boolean {
  return Boolean(
    env.supabaseUrl &&
      env.supabaseAnonKey &&
      isValidSupabaseUrl(env.supabaseUrl),
  );
}

export function isOtpDevMode(): boolean {
  return env.otpDevMode;
}

export function isPhoneOnlyAuth(): boolean {
  return env.phoneOnlyAuth;
}

export function getSupabaseConfigError(): string | null {
  const hasUrl = Boolean(env.supabaseUrl);
  const hasKey = Boolean(env.supabaseAnonKey);

  if (!hasUrl && !hasKey) {
    return null;
  }

  if (!hasUrl || !hasKey) {
    return 'Set both EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env';
  }

  if (!isValidSupabaseUrl(env.supabaseUrl)) {
    return 'EXPO_PUBLIC_SUPABASE_URL must start with https:// (e.g. https://xyz.supabase.co)';
  }

  return null;
}

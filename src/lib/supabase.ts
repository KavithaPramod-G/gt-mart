import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { env, getSupabaseConfigError, isSupabaseConfigured } from '@/lib/env';

let client: SupabaseClient | null = null;
let initFailed = false;

export function getSupabase(): SupabaseClient | null {
  if (initFailed) {
    return null;
  }

  const configError = getSupabaseConfigError();
  if (configError) {
    console.warn('[supabase] Invalid configuration:', configError);
    initFailed = true;
    return null;
  }

  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!client) {
    try {
      client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    } catch (error) {
      initFailed = true;
      console.warn(
        '[supabase] Failed to create client:',
        error instanceof Error ? error.message : error,
      );
      return null;
    }
  }

  return client;
}

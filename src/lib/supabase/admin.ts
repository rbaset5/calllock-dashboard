import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Admin client with service role - bypasses RLS
// Use only in server-side code (API routes, webhooks)
// Note: Not using Database generic for flexibility in dynamic queries
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

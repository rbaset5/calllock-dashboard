import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Debug logging - remove after fixing
  console.log('[Supabase Debug] URL:', url);
  console.log('[Supabase Debug] URL type:', typeof url);
  console.log('[Supabase Debug] Key exists:', !!key);
  console.log('[Supabase Debug] Key length:', key?.length);

  if (!url || !key) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
    );
  }

  return createBrowserClient<Database>(url, key);
}

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

// Hardcoded fallbacks for client-side (these are public keys, safe to expose)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xboybmqtwsxmdokgzclk.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhib3libXF0d3N4bWRva2d6Y2xrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODc3NDUsImV4cCI6MjA4MDI2Mzc0NX0.wGxgfhegig_QPnKu8cGMpYgiP7LdTMeRl4RF93SPeM0';

export function createClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}

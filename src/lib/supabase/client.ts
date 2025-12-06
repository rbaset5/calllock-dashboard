import { createBrowserClient } from '@supabase/ssr';

const SUPABASE_URL = 'https://xboybmqtwsxmdokgzclk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhib3libXF0d3N4bWRva2d6Y2xrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODc3NDUsImV4cCI6MjA4MDI2Mzc0NX0.wGxgfhegig_QPnKu8cGMpYgiP7LdTMeRl4RF93SPeM0';

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookieOptions: {
      path: '/',
      sameSite: 'lax',
      secure: true,
    },
    cookies: {
      get(name: string) {
        if (typeof document === 'undefined') return undefined;
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        const value = match ? decodeURIComponent(match[2]) : undefined;
        console.log('[Supabase Cookie] GET', name, value ? 'found' : 'not found');
        return value;
      },
      set(name: string, value: string, options?: { path?: string; maxAge?: number; domain?: string; secure?: boolean; sameSite?: string }) {
        if (typeof document === 'undefined') return;
        console.log('[Supabase Cookie] SET', name, 'options:', options);
        const opts = options || {};
        let cookie = `${name}=${encodeURIComponent(value)}`;
        cookie += `; path=${opts.path || '/'}`;
        cookie += `; max-age=${opts.maxAge || 31536000}`;
        cookie += '; secure';
        cookie += `; samesite=${opts.sameSite || 'lax'}`;
        console.log('[Supabase Cookie] Setting cookie:', name);
        document.cookie = cookie;
      },
      remove(name: string, options?: { path?: string }) {
        if (typeof document === 'undefined') return;
        console.log('[Supabase Cookie] REMOVE', name);
        document.cookie = `${name}=; path=${options?.path || '/'}; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=lax`;
      },
    },
  });
}

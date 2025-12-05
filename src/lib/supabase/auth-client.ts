// Direct auth implementation - bypasses Supabase library entirely
const SUPABASE_URL = 'https://xboybmqtwsxmdokgzclk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhib3libXF0d3N4bWRva2d6Y2xrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODc3NDUsImV4cCI6MjA4MDI2Mzc0NX0.wGxgfhegig_QPnKu8cGMpYgiP7LdTMeRl4RF93SPeM0';

interface AuthResponse {
  data: { user: unknown; session: unknown } | null;
  error: { message: string } | null;
}

// Raw fetch to Supabase auth - no library
async function rawSignUp(email: string, password: string, metadata: Record<string, unknown>): Promise<AuthResponse> {
  const url = `${SUPABASE_URL}/auth/v1/signup`;
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  };
  const body = JSON.stringify({
    email,
    password,
    data: metadata,
  });

  // Debug everything
  console.log('[Raw Auth] URL:', url);
  console.log('[Raw Auth] URL type:', typeof url);
  console.log('[Raw Auth] Headers:', JSON.stringify(headers));
  console.log('[Raw Auth] Body:', body);
  console.log('[Raw Auth] fetch available:', typeof fetch);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: body,
    });

    const data = await response.json();

    if (!response.ok) {
      return { data: null, error: { message: data.error_description || data.msg || 'Signup failed' } };
    }

    return { data: { user: data.user, session: data.session }, error: null };
  } catch (err) {
    console.error('[Raw Auth] Fetch error:', err);
    return { data: null, error: { message: String(err) } };
  }
}

// Raw fetch for sign in
async function rawSignIn(email: string, password: string): Promise<AuthResponse> {
  const url = `${SUPABASE_URL}/auth/v1/token?grant_type=password`;
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  };
  const body = JSON.stringify({ email, password });

  console.log('[Raw Auth] SignIn URL:', url);
  console.log('[Raw Auth] fetch available:', typeof fetch);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: body,
    });

    const data = await response.json();
    console.log('[Raw Auth] SignIn response status:', response.status);
    console.log('[Raw Auth] SignIn response data:', JSON.stringify(data).substring(0, 200));

    if (!response.ok) {
      console.error('[Raw Auth] SignIn failed:', data);
      return { data: null, error: { message: data.error_description || data.msg || data.error || 'Login failed' } };
    }

    // Store session in localStorage for persistence
    if (typeof window !== 'undefined' && data.access_token) {
      console.log('[Raw Auth] Storing token in localStorage');
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
        user: data.user,
      }));
    }

    console.log('[Raw Auth] SignIn success, user:', data.user?.email);
    return { data: { user: data.user, session: data }, error: null };
  } catch (err) {
    console.error('[Raw Auth] SignIn error:', err);
    return { data: null, error: { message: String(err) } };
  }
}

// Fake client interface to match existing code
export function createAuthClient() {
  return {
    auth: {
      signUp: async ({ email, password, options }: {
        email: string;
        password: string;
        options?: { data?: Record<string, unknown> }
      }) => {
        return rawSignUp(email, password, options?.data || {});
      },
      signInWithPassword: async ({ email, password }: {
        email: string;
        password: string;
      }) => {
        return rawSignIn(email, password);
      },
      resetPasswordForEmail: async (email: string, options?: { redirectTo?: string }) => {
        const url = `${SUPABASE_URL}/auth/v1/recover`;
        const headers = {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        };
        const body = JSON.stringify({
          email,
          redirect_to: options?.redirectTo
        });

        console.log('[Raw Auth] Reset password URL:', url);

        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: body,
          });

          if (!response.ok) {
            const data = await response.json();
            return { data: null, error: { message: data.error_description || data.msg || 'Reset failed' } };
          }

          return { data: {}, error: null };
        } catch (err) {
          console.error('[Raw Auth] Reset error:', err);
          return { data: null, error: { message: String(err) } };
        }
      },
      updateUser: async ({ password }: { password: string }, accessToken?: string) => {
        // Get token from URL hash or parameter
        let token = accessToken;
        if (!token && typeof window !== 'undefined') {
          const hash = window.location.hash.substring(1);
          const params = new URLSearchParams(hash);
          token = params.get('access_token') || undefined;
        }

        if (!token) {
          return { data: null, error: { message: 'No access token found' } };
        }

        const url = `${SUPABASE_URL}/auth/v1/user`;
        const headers = {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
        };
        const body = JSON.stringify({ password });

        console.log('[Raw Auth] Update user URL:', url);
        console.log('[Raw Auth] Using token (first 20 chars):', token?.substring(0, 20));

        try {
          const response = await fetch(url, {
            method: 'PUT',
            headers: headers,
            body: body,
          });

          const data = await response.json();
          console.log('[Raw Auth] Update user response status:', response.status);
          console.log('[Raw Auth] Update user response:', JSON.stringify(data));

          if (!response.ok) {
            const errorMsg = data.error_description || data.msg || data.error || data.message || 'Update failed';
            console.error('[Raw Auth] Update user failed:', errorMsg);
            return { data: null, error: { message: errorMsg } };
          }

          console.log('[Raw Auth] Password updated successfully');
          return { data: { user: data }, error: null };
        } catch (err) {
          console.error('[Raw Auth] Update error:', err);
          return { data: null, error: { message: String(err) } };
        }
      }
    }
  };
}

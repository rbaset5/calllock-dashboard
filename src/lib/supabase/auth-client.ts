// Direct auth implementation - bypasses Supabase library entirely
const SUPABASE_URL = 'https://xboybmqtwsxmdokgzclk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhib3libXF0d3N4bWRva2d6Y2xrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODc3NDUsImV4cCI6MjA4MDI2Mzc0NX0.wGxgfhegig_QPnKu8cGMpYgiP7LdTMeRl4RF93SPeM0';

interface SignUpResponse {
  data: { user: unknown; session: unknown } | null;
  error: { message: string } | null;
}

// Raw fetch to Supabase auth - no library
async function rawSignUp(email: string, password: string, metadata: Record<string, unknown>): Promise<SignUpResponse> {
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
      }
    }
  };
}

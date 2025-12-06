import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

const SUPABASE_URL = 'https://xboybmqtwsxmdokgzclk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhib3libXF0d3N4bWRva2d6Y2xrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODc3NDUsImV4cCI6MjA4MDI2Mzc0NX0.wGxgfhegig_QPnKu8cGMpYgiP7LdTMeRl4RF93SPeM0';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const needsAction = searchParams.get('needs_action');

  // Get user from session cookies
  const cookieStore = await cookies();
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // Not needed for read-only operations
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Use service role to bypass RLS
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const adminClient = createClient(SUPABASE_URL, serviceKey);

  // Build query
  let query = adminClient
    .from('jobs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // Apply filters
  if (needsAction === 'true') {
    query = query.eq('needs_action', true).not('status', 'in', '("complete","cancelled")');
  } else if (status) {
    query = query.eq('status', status);
  }

  const { data: jobs, error } = await query.limit(50);

  if (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }

  // Get user timezone
  const { data: profile } = await adminClient
    .from('users')
    .select('timezone')
    .eq('id', user.id)
    .single();

  return NextResponse.json({
    jobs: jobs || [],
    timezone: profile?.timezone || 'America/New_York',
  });
}

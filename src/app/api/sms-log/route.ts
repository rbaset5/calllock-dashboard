import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, NextRequest } from 'next/server';

const SUPABASE_URL = 'https://xboybmqtwsxmdokgzclk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhib3libXF0d3N4bWRva2d6Y2xrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODc3NDUsImV4cCI6MjA4MDI2Mzc0NX0.wGxgfhegig_QPnKu8cGMpYgiP7LdTMeRl4RF93SPeM0';

export async function GET(request: NextRequest) {
  // Get query params
  const searchParams = request.nextUrl.searchParams;
  const jobId = searchParams.get('job_id');
  const leadId = searchParams.get('lead_id');

  if (!jobId && !leadId) {
    return NextResponse.json(
      { error: 'job_id or lead_id is required' },
      { status: 400 }
    );
  }

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
    .from('sms_log')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // Filter by job_id or lead_id
  if (jobId) {
    query = query.eq('job_id', jobId);
  }
  if (leadId) {
    query = query.eq('lead_id', leadId);
  }

  const { data: messages, error } = await query;

  if (error) {
    console.error('Error fetching SMS log:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SMS history' },
      { status: 500 }
    );
  }

  return NextResponse.json({ messages: messages || [] });
}

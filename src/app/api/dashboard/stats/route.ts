import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

const SUPABASE_URL = 'https://xboybmqtwsxmdokgzclk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhib3libXF0d3N4bWRva2d6Y2xrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODc3NDUsImV4cCI6MjA4MDI2Mzc0NX0.wGxgfhegig_QPnKu8cGMpYgiP7LdTMeRl4RF93SPeM0';

export async function GET() {
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

  // Get user profile
  const { data: profile } = await adminClient
    .from('users')
    .select('email, business_name, timezone')
    .eq('id', user.id)
    .single();

  const timezone = profile?.timezone || 'America/New_York';

  // Get today's date range in user's timezone
  const now = new Date();
  const todayStart = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setHours(23, 59, 59, 999);

  // Get week start (Sunday) and end (Saturday)
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  // Count jobs scheduled for today
  const { count: jobsToday } = await adminClient
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('scheduled_at', todayStart.toISOString())
    .lte('scheduled_at', todayEnd.toISOString())
    .not('status', 'eq', 'cancelled');

  // Sum revenue from completed jobs this week
  const { data: weekJobs } = await adminClient
    .from('jobs')
    .select('revenue')
    .eq('user_id', user.id)
    .eq('status', 'complete')
    .gte('completed_at', weekStart.toISOString());

  const weekRevenue = weekJobs?.reduce((sum, job) => sum + (job.revenue || 0), 0) || 0;

  // Count jobs needing action
  const { count: needsAction } = await adminClient
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('needs_action', true)
    .not('status', 'in', '("complete","cancelled")');

  // Count upcoming jobs this week (from now until end of week, not complete/cancelled)
  const { count: upcomingThisWeek } = await adminClient
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('scheduled_at', now.toISOString())
    .lte('scheduled_at', weekEnd.toISOString())
    .not('status', 'in', '("complete","cancelled")');

  return NextResponse.json({
    user: {
      email: profile?.email || user.email,
      business_name: profile?.business_name || 'Your Business',
    },
    stats: {
      jobsToday: jobsToday || 0,
      weekRevenue,
      needsAction: needsAction || 0,
      upcomingThisWeek: upcomingThisWeek || 0,
    },
  });
}

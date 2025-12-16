import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { Job } from '@/types/database';
import { startOfDay, endOfDay, addDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface UpcomingJob extends Job {
  customer_total_jobs?: number;
}

export interface UpcomingResponse {
  appointments: UpcomingJob[];
  total: number;
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's timezone
    const { data: userProfile } = await supabase
      .from('users')
      .select('timezone')
      .eq('id', user.id)
      .single();

    const timezone = userProfile?.timezone || 'America/New_York';

    // Use admin client to bypass RLS for complex queries
    const adminClient = createAdminClient();

    // Get current time in user's timezone
    const now = new Date();
    const userNow = toZonedTime(now, timezone);

    // Start from tomorrow (exclude today)
    const tomorrowStart = startOfDay(addDays(userNow, 1));
    // End 7 days from now
    const weekEnd = endOfDay(addDays(userNow, 7));

    // Get upcoming jobs (next 7 days, excluding today)
    const { data: upcomingJobs, error: jobsError } = await adminClient
      .from('jobs')
      .select(`
        *,
        customers:customer_id (
          total_jobs
        )
      `)
      .eq('user_id', user.id)
      .in('status', ['new', 'confirmed'])
      .gte('scheduled_at', tomorrowStart.toISOString())
      .lte('scheduled_at', weekEnd.toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(10);

    if (jobsError) {
      console.error('Error fetching upcoming jobs:', jobsError);
      return NextResponse.json({ error: 'Failed to fetch upcoming appointments' }, { status: 500 });
    }

    // Transform the data to include customer_total_jobs at the top level
    const appointments: UpcomingJob[] = (upcomingJobs || []).map(job => {
      const { customers, ...jobData } = job;
      return {
        ...jobData,
        customer_total_jobs: customers?.total_jobs || 1,
      };
    });

    const response: UpcomingResponse = {
      appointments,
      total: appointments.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Upcoming API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

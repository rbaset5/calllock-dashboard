import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { startOfWeek, endOfWeek, addDays, format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface DaySummary {
  date: string;           // YYYY-MM-DD
  dayOfWeek: string;      // Mon, Tue, etc.
  dayOfMonth: number;
  jobCount: number;
  completedCount: number;
  estimatedRevenue: number;
  actualRevenue: number;
  hasAvailableSlots: boolean;
  pendingReviewCount: number;
}

export interface ScheduleWeekResponse {
  weekStart: string;
  weekEnd: string;
  days: DaySummary[];
  totalJobs: number;
  totalRevenue: number;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const weekOffset = parseInt(searchParams.get('weekOffset') || '0', 10);

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
    const adminClient = createAdminClient();

    // Calculate week range
    const now = new Date();
    const userNow = toZonedTime(now, timezone);
    const weekStart = startOfWeek(addDays(userNow, weekOffset * 7), { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(addDays(userNow, weekOffset * 7), { weekStartsOn: 1 }); // Sunday

    // Get all jobs for this week
    const { data: weekJobs, error: jobsError } = await adminClient
      .from('jobs')
      .select('*')
      .eq('user_id', user.id)
      .gte('scheduled_at', weekStart.toISOString())
      .lte('scheduled_at', weekEnd.toISOString())
      .order('scheduled_at', { ascending: true });

    if (jobsError) {
      console.error('Error fetching week jobs:', jobsError);
      return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 });
    }

    // Get pending AI booking reviews for this week
    const { data: pendingReviews } = await adminClient
      .from('ai_booking_reviews')
      .select('original_scheduled_at')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .gte('original_scheduled_at', weekStart.toISOString())
      .lte('original_scheduled_at', weekEnd.toISOString());

    // Group by day
    const days: DaySummary[] = [];
    let totalJobs = 0;
    let totalRevenue = 0;

    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i);
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      const dateStr = format(day, 'yyyy-MM-dd');

      // Filter jobs for this day
      const dayJobs = (weekJobs || []).filter(job => {
        if (!job.scheduled_at) return false;
        const jobDate = parseISO(job.scheduled_at);
        return jobDate >= dayStart && jobDate <= dayEnd;
      });

      // Filter pending reviews for this day
      const dayPendingReviews = (pendingReviews || []).filter(review => {
        const reviewDate = parseISO(review.original_scheduled_at);
        return reviewDate >= dayStart && reviewDate <= dayEnd;
      });

      const completedJobs = dayJobs.filter(j => j.status === 'complete');
      const pendingJobs = dayJobs.filter(j => j.status !== 'complete' && j.status !== 'cancelled');

      const actualRevenue = completedJobs.reduce((sum, j) => sum + (j.revenue || 0), 0);
      const estimatedRevenue = pendingJobs.reduce((sum, j) => sum + (j.estimated_value || 0), 0) + actualRevenue;

      totalJobs += dayJobs.filter(j => j.status !== 'cancelled').length;
      totalRevenue += actualRevenue;

      // Assume available slots if fewer than 6 jobs (simplistic logic)
      const hasAvailableSlots = pendingJobs.length < 6;

      days.push({
        date: dateStr,
        dayOfWeek: format(day, 'EEE'),
        dayOfMonth: day.getDate(),
        jobCount: pendingJobs.length,
        completedCount: completedJobs.length,
        estimatedRevenue,
        actualRevenue,
        hasAvailableSlots,
        pendingReviewCount: dayPendingReviews.length,
      });
    }

    const response: ScheduleWeekResponse = {
      weekStart: format(weekStart, 'yyyy-MM-dd'),
      weekEnd: format(weekEnd, 'yyyy-MM-dd'),
      days,
      totalJobs,
      totalRevenue,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Schedule API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { Job } from '@/types/database';
import { startOfDay, endOfDay, addDays, format } from 'date-fns';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Group jobs by day for display
interface JobGroup {
  label: string; // "Today", "Tomorrow", "Mon, Dec 18", etc.
  date: string;  // ISO date string (YYYY-MM-DD)
  jobs: Job[];
}

export interface BookedResponse {
  groups: JobGroup[];
  counts: {
    total: number;
    today: number;
    tomorrow: number;
    thisWeek: number;
    later: number;
    aiBooked: number;
    manualBooked: number;
  };
}

/**
 * GET /api/booked
 *
 * Returns confirmed appointments (BOOKED items).
 * Grouped by day, ordered chronologically.
 *
 * Query params:
 * - days: Number of days to fetch (default: 14)
 * - include_past: Include past appointments from today (default: false)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const daysAhead = parseInt(searchParams.get('days') || '14', 10);
    const includePast = searchParams.get('include_past') === 'true';

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

    const adminClient = createAdminClient();

    // Date range
    const now = new Date();
    const today = startOfDay(now);
    const rangeEnd = endOfDay(addDays(today, daysAhead));

    // Build query for BOOKED jobs
    // BOOKED = jobs with scheduled_at, not cancelled
    let query = adminClient
      .from('jobs')
      .select('*')
      .eq('user_id', user.id)
      .not('scheduled_at', 'is', null)
      .neq('status', 'cancelled');

    // Filter by date range
    if (includePast) {
      // Include all of today, even past appointments
      query = query
        .gte('scheduled_at', today.toISOString())
        .lte('scheduled_at', rangeEnd.toISOString());
    } else {
      // Only future appointments from now
      query = query
        .gte('scheduled_at', now.toISOString())
        .lte('scheduled_at', rangeEnd.toISOString());
    }

    // Order by scheduled_at ascending
    query = query.order('scheduled_at', { ascending: true });

    const { data: jobs, error: jobsError } = await query;

    if (jobsError) {
      console.error('Error fetching booked jobs:', jobsError);
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
    }

    // Group jobs by day
    const groupMap = new Map<string, Job[]>();
    const tomorrow = startOfDay(addDays(today, 1));
    const dayAfterTomorrow = startOfDay(addDays(today, 2));
    const weekEnd = startOfDay(addDays(today, 7));

    (jobs || []).forEach(job => {
      if (!job.scheduled_at) return;

      const jobDate = startOfDay(new Date(job.scheduled_at));
      const dateKey = format(jobDate, 'yyyy-MM-dd');

      if (!groupMap.has(dateKey)) {
        groupMap.set(dateKey, []);
      }
      groupMap.get(dateKey)!.push(job);
    });

    // Convert to array with labels
    const groups: JobGroup[] = [];
    groupMap.forEach((groupJobs, dateKey) => {
      const date = new Date(dateKey);
      let label: string;

      if (dateKey === format(today, 'yyyy-MM-dd')) {
        label = 'Today';
      } else if (dateKey === format(tomorrow, 'yyyy-MM-dd')) {
        label = 'Tomorrow';
      } else {
        label = format(date, 'EEE, MMM d'); // "Mon, Dec 18"
      }

      groups.push({
        label,
        date: dateKey,
        jobs: groupJobs,
      });
    });

    // Calculate counts
    const allJobs = jobs || [];
    const todayStr = format(today, 'yyyy-MM-dd');
    const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');

    const counts = {
      total: allJobs.length,
      today: allJobs.filter(j => j.scheduled_at && format(new Date(j.scheduled_at), 'yyyy-MM-dd') === todayStr).length,
      tomorrow: allJobs.filter(j => j.scheduled_at && format(new Date(j.scheduled_at), 'yyyy-MM-dd') === tomorrowStr).length,
      thisWeek: allJobs.filter(j => {
        if (!j.scheduled_at) return false;
        const jobDate = new Date(j.scheduled_at);
        return jobDate >= dayAfterTomorrow && jobDate < weekEnd;
      }).length,
      later: allJobs.filter(j => {
        if (!j.scheduled_at) return false;
        const jobDate = new Date(j.scheduled_at);
        return jobDate >= weekEnd;
      }).length,
      aiBooked: allJobs.filter(j => j.is_ai_booked).length,
      manualBooked: allJobs.filter(j => !j.is_ai_booked).length,
    };

    const response: BookedResponse = {
      groups,
      counts,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Booked API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { Job, AIBookingReview } from '@/types/database';
import { parseISO, startOfDay, endOfDay, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface TimeSlot {
  time: string;           // e.g., "8:00 AM"
  hour: number;           // 8, 9, 10, etc.
  job: Job | null;
  isAvailable: boolean;
  pendingReview: AIBookingReview | null;
}

export interface DayScheduleResponse {
  date: string;
  dateDisplay: string;    // e.g., "Monday, December 9"
  jobs: Job[];
  timeSlots: TimeSlot[];
  pendingReviews: (AIBookingReview & { job: Job })[];
  totalEstimatedRevenue: number;
  availableSlotCount: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const { date } = await params;

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

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

    // Parse the date
    const targetDate = parseISO(date);
    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);

    // Get all jobs for this day
    const { data: jobs, error: jobsError } = await adminClient
      .from('jobs')
      .select('*')
      .eq('user_id', user.id)
      .gte('scheduled_at', dayStart.toISOString())
      .lte('scheduled_at', dayEnd.toISOString())
      .not('status', 'eq', 'cancelled')
      .order('scheduled_at', { ascending: true });

    if (jobsError) {
      console.error('Error fetching day jobs:', jobsError);
      return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 });
    }

    // Get pending AI booking reviews for this day
    const { data: pendingReviewsRaw } = await adminClient
      .from('ai_booking_reviews')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .gte('original_scheduled_at', dayStart.toISOString())
      .lte('original_scheduled_at', dayEnd.toISOString());

    // Map reviews to include job data
    const pendingReviews = await Promise.all(
      (pendingReviewsRaw || []).map(async (review) => {
        const job = (jobs || []).find(j => j.id === review.job_id);
        return { ...review, job: job! };
      })
    ).then(reviews => reviews.filter(r => r.job));

    // Build time slots (8 AM to 8 PM)
    const timeSlots: TimeSlot[] = [];
    const businessHours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]; // 8 AM to 8 PM

    for (const hour of businessHours) {
      const hourStr = hour > 12 ? `${hour - 12}:00 PM` : hour === 12 ? '12:00 PM' : `${hour}:00 AM`;

      // Find job scheduled for this hour
      const job = (jobs || []).find(j => {
        if (!j.scheduled_at) return false;
        const jobDate = toZonedTime(parseISO(j.scheduled_at), timezone);
        return jobDate.getHours() === hour;
      });

      // Find pending review for this hour
      const pendingReview = (pendingReviewsRaw || []).find(r => {
        const reviewDate = toZonedTime(parseISO(r.original_scheduled_at), timezone);
        return reviewDate.getHours() === hour;
      });

      timeSlots.push({
        time: hourStr,
        hour,
        job: job || null,
        isAvailable: !job,
        pendingReview: pendingReview || null,
      });
    }

    // Calculate stats
    const totalEstimatedRevenue = (jobs || []).reduce((sum, j) => {
      if (j.status === 'complete') return sum + (j.revenue || 0);
      return sum + (j.estimated_value || 0);
    }, 0);

    const availableSlotCount = timeSlots.filter(s => s.isAvailable).length;

    const response: DayScheduleResponse = {
      date,
      dateDisplay: format(targetDate, 'EEEE, MMMM d'),
      jobs: jobs || [],
      timeSlots,
      pendingReviews,
      totalEstimatedRevenue,
      availableSlotCount,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Day schedule API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

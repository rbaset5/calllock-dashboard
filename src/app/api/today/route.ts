import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { Job, Lead, AIBookingReview } from '@/types/database';
import { startOfDay, endOfDay, parseISO, isToday, addDays, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Action Item types - corrected naming:
// - missed_call: Customer hung up (Lead status: abandoned) - TRUE missed call
// - needs_callback: Customer requested callback (Lead status: callback_requested)
// - callback_requested: Customer thinking it over (Lead status: thinking)
// - pending_quote: Voicemail left (Lead status: voicemail_left)
// - follow_up_due: Completed jobs needing follow-up (from Jobs table)
export type ActionItemType =
  | 'missed_call'
  | 'needs_callback'
  | 'pending_quote'
  | 'callback_requested'
  | 'follow_up_due';

export type ActionItemUrgency = 'high' | 'medium' | 'low';

export interface ActionItem {
  id: string;
  type: ActionItemType;
  urgency: ActionItemUrgency;
  title: string;             // Customer name
  summary: string;           // Issue description or context
  phone?: string;            // Customer phone (tappable)
  createdAt: string;         // When this item was created
  // Type-specific fields
  estimatedValue?: number;   // For pending_quote
  serviceType?: string;      // Service type display
  quoteAmount?: number;      // For pending_quote
  dueDate?: string;          // For follow_up_due
  lastServiceDate?: string;  // For follow_up_due context
  lastServiceType?: string;  // For follow_up_due context
  // Original data for linking
  leadId?: string;
  customerId?: string;
  jobId?: string;
}

export interface WeekDayPreview {
  date: string;
  dayName: string;
  jobCount: number;
  estimatedRevenue: number;
}

export interface TodayResponse {
  currentJob: Job | null;
  nextJob: Job | null;
  queue: Job[];
  dayStats: {
    totalJobs: number;
    completedJobs: number;
    estimatedRevenue: number;
    actualRevenue: number;
  };
  pendingReviewsCount: number;
  activeLeadsCount: number;
  actionItems: ActionItem[];
  weekPreview: WeekDayPreview[];
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
    const todayStart = startOfDay(userNow);
    const todayEnd = endOfDay(userNow);

    // Get all jobs for today (scheduled or created today, not complete/cancelled)
    const { data: todayJobs, error: jobsError } = await adminClient
      .from('jobs')
      .select('*')
      .eq('user_id', user.id)
      .not('status', 'in', '("complete","cancelled")')
      .or(`scheduled_at.gte.${todayStart.toISOString()},scheduled_at.lte.${todayEnd.toISOString()}`)
      .order('scheduled_at', { ascending: true, nullsFirst: false });

    if (jobsError) {
      console.error('Error fetching today jobs:', jobsError);
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
    }

    // Filter to only today's jobs
    const jobs = (todayJobs || []).filter(job => {
      if (!job.scheduled_at) return false;
      const jobDate = parseISO(job.scheduled_at);
      const jobDateInTz = toZonedTime(jobDate, timezone);
      return isToday(jobDateInTz);
    });

    // Find current job (en_route or on_site)
    const currentJob = jobs.find(j => j.status === 'en_route' || j.status === 'on_site') || null;

    // Find next job (first job after current that's not in progress)
    let nextJob: Job | null = null;
    let queue: Job[] = [];

    if (currentJob) {
      // Filter out current job and get remaining
      const remaining = jobs.filter(j => j.id !== currentJob.id && j.status !== 'en_route' && j.status !== 'on_site');
      nextJob = remaining[0] || null;
      queue = remaining.slice(1);
    } else {
      // No current job - first scheduled job is next
      const pending = jobs.filter(j => j.status === 'new' || j.status === 'confirmed');
      nextJob = pending[0] || null;
      queue = pending.slice(1);
    }

    // Get completed jobs for today (for stats)
    const { data: completedToday } = await adminClient
      .from('jobs')
      .select('revenue')
      .eq('user_id', user.id)
      .eq('status', 'complete')
      .gte('completed_at', todayStart.toISOString())
      .lte('completed_at', todayEnd.toISOString());

    // Calculate stats
    const totalJobs = jobs.length + (completedToday?.length || 0);
    const completedJobs = completedToday?.length || 0;
    const actualRevenue = (completedToday || []).reduce((sum, j) => sum + (j.revenue || 0), 0);
    const estimatedRevenue = jobs.reduce((sum, j) => sum + (j.estimated_value || 0), 0) + actualRevenue;

    // Get pending AI booking reviews count
    const { count: pendingReviewsCount } = await adminClient
      .from('ai_booking_reviews')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'pending');

    // Get active leads count (for follow-up badge)
    const { count: activeLeadsCount } = await adminClient
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .not('status', 'in', '("converted","lost")')
      .or('remind_at.is.null,remind_at.lte.' + now.toISOString());

    // Get action items: 5 types with corrected naming
    const actionItems: ActionItem[] = [];

    // 1. MISSED CALLS (TRUE missed calls) - leads with abandoned status (customer hung up)
    const { data: abandonedLeads } = await adminClient
      .from('leads')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'abandoned')
      .or('remind_at.is.null,remind_at.lte.' + now.toISOString())
      .order('created_at', { ascending: false })
      .limit(5);

    if (abandonedLeads) {
      for (const lead of abandonedLeads) {
        const summary = lead.issue_description
          ? `"${lead.issue_description.substring(0, 50)}${lead.issue_description.length > 50 ? '...' : ''}"`
          : 'Customer hung up - call back ASAP';

        actionItems.push({
          id: `missed-${lead.id}`,
          type: 'missed_call',
          urgency: 'high',
          title: lead.customer_name,
          summary,
          phone: lead.customer_phone,
          createdAt: lead.created_at,
          estimatedValue: lead.estimated_value || undefined,
          leadId: lead.id,
        });
      }
    }

    // 2. NEEDS CALLBACK - leads with callback_requested status (customer explicitly asked for callback)
    const { data: needsCallbackLeads } = await adminClient
      .from('leads')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'callback_requested')
      .or('remind_at.is.null,remind_at.lte.' + now.toISOString())
      .order('created_at', { ascending: false })
      .limit(5);

    if (needsCallbackLeads) {
      for (const lead of needsCallbackLeads) {
        const summary = lead.issue_description
          ? `"${lead.issue_description.substring(0, 50)}${lead.issue_description.length > 50 ? '...' : ''}"`
          : lead.service_type || 'Callback requested';

        actionItems.push({
          id: `needscallback-${lead.id}`,
          type: 'needs_callback',
          urgency: 'high',
          title: lead.customer_name,
          summary,
          phone: lead.customer_phone,
          createdAt: lead.created_at,
          estimatedValue: lead.estimated_value || undefined,
          leadId: lead.id,
        });
      }
    }

    // 3. PENDING QUOTES - leads with voicemail_left status (quote sent, waiting response)
    const { data: pendingQuoteLeads } = await adminClient
      .from('leads')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'voicemail_left')
      .or('remind_at.is.null,remind_at.lte.' + now.toISOString())
      .order('created_at', { ascending: false })
      .limit(5);

    if (pendingQuoteLeads) {
      for (const lead of pendingQuoteLeads) {
        actionItems.push({
          id: `quote-${lead.id}`,
          type: 'pending_quote',
          urgency: 'medium',
          title: lead.customer_name,
          summary: lead.service_type || 'Service quote',
          phone: lead.customer_phone,
          createdAt: lead.created_at,
          quoteAmount: lead.estimated_value || undefined,
          serviceType: lead.service_type,
          leadId: lead.id,
        });
      }
    }

    // 4. CALLBACK REQUESTED - leads with thinking status (customer wants to think/discuss)
    const { data: thinkingLeads } = await adminClient
      .from('leads')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'thinking')
      .or('remind_at.is.null,remind_at.lte.' + now.toISOString())
      .order('created_at', { ascending: false })
      .limit(5);

    if (thinkingLeads) {
      for (const lead of thinkingLeads) {
        const summary = lead.why_not_booked
          ? `"${lead.why_not_booked.substring(0, 50)}${lead.why_not_booked.length > 50 ? '...' : ''}"`
          : 'Wants to discuss options';

        actionItems.push({
          id: `callback-${lead.id}`,
          type: 'callback_requested',
          urgency: 'low',
          title: lead.customer_name,
          summary,
          phone: lead.customer_phone,
          createdAt: lead.callback_requested_at || lead.created_at,
          leadId: lead.id,
        });
      }
    }

    // 5. FOLLOW-UPS DUE - completed jobs that need post-service follow-up
    // Look for jobs completed in the last 7 days that might need follow-up
    const sevenDaysAgo = addDays(now, -7);
    const { data: followUpJobs } = await adminClient
      .from('jobs')
      .select('*, customers:customer_id(name, phone)')
      .eq('user_id', user.id)
      .eq('status', 'complete')
      .gte('completed_at', sevenDaysAgo.toISOString())
      .order('completed_at', { ascending: false })
      .limit(3);

    if (followUpJobs) {
      for (const job of followUpJobs) {
        // Only add if completed 2+ days ago (give time before follow-up)
        const completedAt = job.completed_at ? new Date(job.completed_at) : now;
        const daysSinceComplete = (now.getTime() - completedAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceComplete < 2) continue;

        actionItems.push({
          id: `followup-${job.id}`,
          type: 'follow_up_due',
          urgency: daysSinceComplete > 5 ? 'high' : 'low',
          title: job.customer_name,
          summary: 'Post-service check-in',
          phone: job.customer_phone,
          createdAt: job.completed_at || job.created_at,
          lastServiceDate: job.completed_at || undefined,
          lastServiceType: job.service_type,
          jobId: job.id,
          customerId: job.customer_id || undefined,
        });
      }
    }

    // Sort action items by urgency (high > medium > low) then by createdAt
    const urgencyOrder = { high: 0, medium: 1, low: 2 };
    actionItems.sort((a, b) => {
      const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      if (urgencyDiff !== 0) return urgencyDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Get week preview (next 3 days after today)
    const weekPreview: WeekDayPreview[] = [];

    for (let i = 1; i <= 3; i++) {
      const dayDate = addDays(userNow, i);
      const dayStart = startOfDay(dayDate);
      const dayEnd = endOfDay(dayDate);

      const { data: dayJobs } = await adminClient
        .from('jobs')
        .select('estimated_value, status')
        .eq('user_id', user.id)
        .not('status', 'eq', 'cancelled')
        .gte('scheduled_at', dayStart.toISOString())
        .lte('scheduled_at', dayEnd.toISOString());

      const jobCount = dayJobs?.length || 0;
      const estimatedRev = (dayJobs || []).reduce((sum, j) => sum + (j.estimated_value || 0), 0);

      weekPreview.push({
        date: format(dayDate, 'yyyy-MM-dd'),
        dayName: format(dayDate, 'EEE'),
        jobCount,
        estimatedRevenue: estimatedRev,
      });
    }

    const response: TodayResponse = {
      currentJob,
      nextJob,
      queue,
      dayStats: {
        totalJobs,
        completedJobs,
        estimatedRevenue,
        actualRevenue,
      },
      pendingReviewsCount: pendingReviewsCount || 0,
      activeLeadsCount: activeLeadsCount || 0,
      actionItems,
      weekPreview,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Today API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { createClient } from '@/lib/supabase/server';
import { NeedsActionAlert } from '@/components/dashboard/needs-action-alert';
import { StaleJobsWarning } from '@/components/dashboard/stale-jobs-warning';
import { WeekJobs } from '@/components/dashboard/week-jobs';
import { RevenueCard } from '@/components/dashboard/revenue-card';
import { StatsSummary } from '@/components/dashboard/stats-summary';
import { startOfWeek, startOfMonth, subMonths, subDays, addDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export default async function DashboardPage() {
  const supabase = await createClient();

  // Get current user and their timezone
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('users')
    .select('timezone')
    .eq('id', user.id)
    .single();

  const timezone = profile?.timezone || 'America/New_York';

  // Calculate date ranges in user's timezone
  const now = new Date();
  const zonedNow = toZonedTime(now, timezone);

  const weekStart = startOfWeek(zonedNow, { weekStartsOn: 1 }); // Monday
  const monthStart = startOfMonth(zonedNow);
  const lastMonthStart = startOfMonth(subMonths(zonedNow, 1));
  const lastMonthEnd = startOfMonth(zonedNow);

  // For WeekJobs: fetch 30 days past to 90 days future for client-side week navigation
  const scheduledRangeStart = subDays(now, 30);
  const scheduledRangeEnd = addDays(now, 90);

  // Fetch all needed data in parallel
  const [
    needsActionResult,
    staleJobsResult,
    scheduledJobsResult,
    weekJobsResult,
    monthRevenueResult,
    lastMonthRevenueResult,
  ] = await Promise.all([
    // Jobs needing action
    supabase
      .from('jobs')
      .select('*')
      .eq('user_id', user.id)
      .eq('needs_action', true)
      .not('status', 'in', '("complete","cancelled")'),

    // Stale jobs (new status > 24 hours)
    supabase
      .from('jobs')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'new')
      .lt('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()),

    // Scheduled jobs (30 days past to 90 days future for week navigation)
    supabase
      .from('jobs')
      .select('*')
      .eq('user_id', user.id)
      .gte('scheduled_at', scheduledRangeStart.toISOString())
      .lte('scheduled_at', scheduledRangeEnd.toISOString())
      .not('status', 'eq', 'cancelled')
      .order('scheduled_at', { ascending: true }),

    // This week's jobs
    supabase
      .from('jobs')
      .select('id, status')
      .eq('user_id', user.id)
      .gte('created_at', weekStart.toISOString()),

    // This month's revenue
    supabase
      .from('jobs')
      .select('revenue')
      .eq('user_id', user.id)
      .eq('status', 'complete')
      .gte('completed_at', monthStart.toISOString())
      .not('revenue', 'is', null),

    // Last month's revenue
    supabase
      .from('jobs')
      .select('revenue')
      .eq('user_id', user.id)
      .eq('status', 'complete')
      .gte('completed_at', lastMonthStart.toISOString())
      .lt('completed_at', lastMonthEnd.toISOString())
      .not('revenue', 'is', null),
  ]);

  const needsActionJobs = needsActionResult.data || [];
  const staleJobs = staleJobsResult.data || [];
  const scheduledJobs = scheduledJobsResult.data || [];
  const weekJobs = weekJobsResult.data || [];

  // Calculate stats
  const totalRevenue = (monthRevenueResult.data || []).reduce(
    (sum, job) => sum + (job.revenue || 0),
    0
  );
  const lastMonthRevenue = (lastMonthRevenueResult.data || []).reduce(
    (sum, job) => sum + (job.revenue || 0),
    0
  );
  const jobsCompleted = (monthRevenueResult.data || []).length;

  const weekCompleted = weekJobs.filter((j) => j.status === 'complete').length;
  const completionRate =
    weekJobs.length > 0 ? Math.round((weekCompleted / weekJobs.length) * 100) : 0;

  return (
    <div className="p-4 lg:p-6">
      {/* Priority-based grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
        {/* Row 1: Critical alerts (top-left priority per F/Z pattern) */}
        <div className="lg:col-span-2">
          <NeedsActionAlert jobs={needsActionJobs} />
        </div>
        <div className="lg:col-span-2">
          <StaleJobsWarning jobs={staleJobs} />
        </div>

        {/* Row 2: Main content cards (larger, span 2 rows) */}
        <div className="lg:col-span-2 lg:row-span-2">
          <WeekJobs jobs={scheduledJobs} timezone={timezone} />
        </div>
        <div className="lg:col-span-2 lg:row-span-2">
          <RevenueCard
            totalRevenue={totalRevenue}
            jobsCompleted={jobsCompleted}
            previousMonthRevenue={lastMonthRevenue > 0 ? lastMonthRevenue : undefined}
          />
        </div>

        {/* Row 3: Stats summary (spans full width on desktop) */}
        <div className="lg:col-span-4">
          <StatsSummary
            jobsThisWeek={weekJobs.length}
            needsActionCount={needsActionJobs.length}
            completedThisWeek={weekCompleted}
            completionRate={completionRate}
          />
        </div>
      </div>
    </div>
  );
}

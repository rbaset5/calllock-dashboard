'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Job } from '@/types/database';
import { TodayResponse } from '@/app/api/today/route';
import { Button } from '@/components/ui/button';
import { MiniCalendar } from '@/components/ui/mini-calendar';
import { VerticalImageStack, StackJob } from '@/components/ui/vertical-image-stack';
import { TimelineJob } from '@/components/ui/daily-timeline-scheduler';
import { UpcomingResponse } from '@/app/api/upcoming/route';
import { Sun, Moon, CloudSun, RefreshCw, Navigation, Play, MapPin, Clock, AlertTriangle, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

function getGreeting(): { text: string; icon: typeof Sun } {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Good morning', icon: Sun };
  if (hour < 17) return { text: 'Good afternoon', icon: CloudSun };
  return { text: 'Good evening', icon: Moon };
}

function formatJobTime(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'h:mm a');
  } catch {
    return '';
  }
}

// Extract problem type from AI summary
// "The customer called about their AC not cooling properly..." → "AC not cooling"
function extractProblemType(aiSummary: string | null | undefined): string {
  if (!aiSummary) return "HVAC Service";
  // Take first sentence and clean it up
  const firstSentence = aiSummary.split(/[.!?]/)[0].trim();
  // Remove common prefixes
  const cleaned = firstSentence
    .replace(/^(the customer (called|reported|mentioned|said) (about |that )?)/i, '')
    .replace(/^(their |the )/i, '');
  // Capitalize first letter and limit length
  const capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return capitalized.length > 35 ? capitalized.slice(0, 35) + "..." : capitalized;
}

// Extract neighborhood/city from full address
// "123 Oak St, East Austin, TX 78701" → "East Austin"
function extractNeighborhood(address: string | null | undefined): string {
  if (!address) return "";
  const parts = address.split(',').map(p => p.trim());
  // Return second part (usually city/neighborhood) or first part if only one
  if (parts.length >= 2) {
    // Skip state/zip if present in second part
    const neighborhood = parts[1].replace(/\s+(TX|CA|NY|FL)\s*\d*/i, '').trim();
    return neighborhood || parts[0];
  }
  return parts[0];
}

export default function TodayPage() {
  const router = useRouter();
  const [data, setData] = useState<TodayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [staleCount, setStaleCount] = useState(0);
  const [upcomingData, setUpcomingData] = useState<UpcomingResponse | null>(null);

  const fetchData = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);

      // Fetch today data, inbox count, and upcoming in parallel
      const [todayResponse, inboxResponse, upcomingResponse] = await Promise.all([
        fetch('/api/today'),
        fetch('/api/inbox/count'),
        fetch('/api/upcoming'),
      ]);

      if (!todayResponse.ok) {
        throw new Error('Failed to fetch today data');
      }
      const result: TodayResponse = await todayResponse.json();
      setData(result);

      if (inboxResponse.ok) {
        const inboxData = await inboxResponse.json();
        setStaleCount(inboxData.staleCount || 0);
      }

      if (upcomingResponse.ok) {
        const upcoming: UpcomingResponse = await upcomingResponse.json();
        setUpcomingData(upcoming);
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching today data:', err);
      setError("Unable to load today's schedule");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Get business name from localStorage
    const tokenData = localStorage.getItem('supabase.auth.token');
    if (tokenData) {
      try {
        const parsed = JSON.parse(tokenData);
        const name = parsed.user?.user_metadata?.business_name;
        if (name) setBusinessName(name);
      } catch (e) {
        console.error('Error parsing token data:', e);
      }
    }

    // Refresh every 30 seconds
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Build job counts for calendar dots (must be before conditional returns)
  const jobCounts = useMemo(() => {
    if (!data) return {};

    const counts: Record<string, number> = {};
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    counts[todayKey] = data.dayStats.totalJobs;

    data.weekPreview?.forEach(day => {
      counts[day.date] = day.jobCount;
    });

    upcomingData?.appointments?.forEach(apt => {
      if (apt.scheduled_at) {
        const dateKey = format(parseISO(apt.scheduled_at), 'yyyy-MM-dd');
        counts[dateKey] = (counts[dateKey] || 0) + 1;
      }
    });

    return counts;
  }, [data, upcomingData]);

  // Transform jobs for timeline display
  const timelineJobs = useMemo((): TimelineJob[] => {
    if (!data) return [];

    const allJobs = [
      ...(data.currentJob ? [data.currentJob] : []),
      ...(data.nextJob ? [data.nextJob] : []),
      ...data.queue,
      ...(upcomingData?.appointments || [])
    ];

    return allJobs.map(job => ({
      id: job.id,
      title: extractProblemType(job.ai_summary),
      customerName: job.customer_name || '',
      scheduledTime: job.scheduled_at ? parseISO(job.scheduled_at) : new Date(),
      address: job.customer_address || '',
    }));
  }, [data, upcomingData]);

  // Inbox-eligible statuses (leads needing action, not scheduled work)
  const INBOX_STATUSES = ['callback_requested', 'thinking', 'voicemail_left', 'new'];

  // Map job status to request type for triage card
  const getRequestType = (status: string | null): string => {
    const statusMap: Record<string, string> = {
      'callback_requested': 'Callback Request',
      'thinking': 'Quote Follow-up',
      'voicemail_left': 'Voicemail',
      'new': 'New Lead',
    };
    return statusMap[status || ''] || 'Action Needed';
  };

  // Transform jobs for card stack display (triage cards)
  // Only include inbox-eligible statuses, not scheduled/confirmed work
  const stackJobs = useMemo((): StackJob[] => {
    if (!data) return [];

    const allJobs = [
      ...(data.currentJob ? [data.currentJob] : []),
      ...(data.nextJob ? [data.nextJob] : []),
      ...data.queue,
      ...(upcomingData?.appointments || [])
    ];

    // Filter to only inbox-eligible items (not confirmed/scheduled jobs)
    const inboxJobs = allJobs.filter(job =>
      INBOX_STATUSES.includes(job.status || '')
    );

    return inboxJobs.map(job => ({
      id: job.id,
      requestType: getRequestType(job.status),
      problem: extractProblemType(job.ai_summary),
      customerName: job.customer_name || '',
      customerPhone: job.customer_phone || '',
      receivedAt: job.created_at || job.scheduled_at || new Date().toISOString(),
    }));
  }, [data, upcomingData]);

  const { text: greetingText, icon: GreetingIcon } = getGreeting();

  if (loading) {
    return (
      <div className="cl-page-container">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-navy-100 rounded w-48" />
          <div className="h-32 bg-navy-100 rounded" />
          <div className="h-24 bg-navy-100 rounded" />
          <div className="h-48 bg-navy-100 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cl-page-container">
        <div className="text-center py-12">
          <p className="text-error-600 mb-4">{error}</p>
          <Button onClick={() => fetchData()}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { dayStats, nextJob, queue } = data;
  const laterTodayJobs = queue.slice(0, 3); // Show up to 3 later jobs

  // Get next job time
  const nextJobTime = nextJob?.scheduled_at ? formatJobTime(nextJob.scheduled_at) : '';

  // Service type display
  const getServiceType = (job: Job) => {
    const types: Record<string, string> = {
      hvac: 'HVAC',
      plumbing: 'Plumbing',
      electrical: 'Electrical',
      general: 'Service',
    };
    return types[job.service_type || ''] || 'Service';
  };

  // Handle navigate click
  const handleNavigate = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://maps.google.com/maps?daddr=${encodedAddress}`, '_blank');
  };

  return (
    <div className="cl-page-container space-y-5">
      {/* Header with Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <GreetingIcon className="w-5 h-5 text-gold-500" />
            <h1 className="text-xl font-semibold text-navy-800">
              {greetingText}
              {businessName ? `, ${businessName.split(' ')[0]}` : ''}
            </h1>
          </div>
          <p className="text-sm text-navy-400 mt-0.5">
            {format(new Date(), 'EEEE, MMMM d')}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchData(true)}
          disabled={refreshing}
          aria-label="Refresh data"
        >
          <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
        </Button>
      </div>

      {/* Stats Cards - Navy + Gold color system */}
      <div className="grid grid-cols-2 gap-3">
        {/* Jobs Today - Navy */}
        <div className="relative overflow-hidden bg-navy-700 text-white rounded-xl p-4">
          <div className="relative z-10">
            <div className="text-white/70 text-xs font-medium mb-1">Today&apos;s Jobs</div>
            <div className="text-3xl font-bold tracking-tight">
              {dayStats.totalJobs}
            </div>
          </div>
          <svg className="absolute right-0 top-0 h-full w-2/3 pointer-events-none" viewBox="0 0 300 200" fill="none" aria-hidden="true">
            <circle cx="220" cy="100" r="90" fill="#fff" fillOpacity="0.05" />
            <circle cx="260" cy="60" r="60" fill="#fff" fillOpacity="0.08" />
          </svg>
        </div>

        {/* Est. Revenue - Gold accent */}
        <div className="relative overflow-hidden bg-gold-500 text-white rounded-xl p-4">
          <div className="relative z-10">
            <div className="text-white/80 text-xs font-medium mb-1">Est. Revenue</div>
            <div className="text-3xl font-bold tracking-tight">
              ${(dayStats.estimatedRevenue || 0).toLocaleString()}
            </div>
          </div>
          <svg className="absolute right-0 top-0 h-full w-2/3 pointer-events-none" viewBox="0 0 300 200" fill="none" aria-hidden="true">
            <circle cx="220" cy="100" r="90" fill="#fff" fillOpacity="0.1" />
            <circle cx="260" cy="60" r="60" fill="#fff" fillOpacity="0.15" />
          </svg>
        </div>
      </div>


      {/* NEEDS ATTENTION - Stale Items Alert */}
      {staleCount > 0 && (
        <Link
          href="/inbox?filter=stale"
          className="flex items-center justify-between p-4 bg-gold-50 border border-gold-200 rounded-xl hover:bg-gold-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gold-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-gold-600" />
            </div>
            <div>
              <p className="font-semibold text-gold-800">Needs Attention</p>
              <p className="text-sm text-gold-600">
                {staleCount} stale item{staleCount !== 1 ? 's' : ''} (3+ days old)
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gold-600" />
        </Link>
      )}

      {/* Weekly Calendar with Timeline */}
      <MiniCalendar
        jobCounts={jobCounts}
        jobs={timelineJobs}
        onJobClick={(job) => router.push(`/jobs/${job.id}`)}
      />

      {/* Inbox Section */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-navy-800">
          Inbox ({stackJobs.length})
        </h2>
        <VerticalImageStack
          jobs={stackJobs.length > 0 ? stackJobs : undefined}
          onJobClick={(job) => router.push(`/jobs/${job.id}`)}
        />
      </div>

    </div>
  );
}

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Job } from '@/types/database';
import { TodayResponse } from '@/app/api/today/route';
import { TodayScheduleSection, ActionItemsSection } from '@/components/today';
import { Button } from '@/components/ui/button';
import { SearchBar } from '@/components/ui/search-bar';
import { Sun, Moon, CloudSun, RefreshCw } from 'lucide-react';

function getGreeting(): { text: string; icon: typeof Sun } {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Good morning', icon: Sun };
  if (hour < 17) return { text: 'Good afternoon', icon: CloudSun };
  return { text: 'Good evening', icon: Moon };
}

export default function TodayPage() {
  const router = useRouter();
  const [data, setData] = useState<TodayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string>('');
  const [timezone, setTimezone] = useState<string>('America/New_York');
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);

      const response = await fetch('/api/today');
      if (!response.ok) {
        throw new Error('Failed to fetch today data');
      }
      const result: TodayResponse = await response.json();
      setData(result);
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
        const tz = parsed.user?.user_metadata?.timezone || 'America/New_York';
        if (name) setBusinessName(name);
        setTimezone(tz);
      } catch (e) {
        console.error('Error parsing token data:', e);
      }
    }

    // Refresh every 30 seconds
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Combine all jobs into a single array for agenda view
  const allJobs = useMemo(() => {
    if (!data) return [];
    const jobs: Job[] = [];
    if (data.currentJob) jobs.push(data.currentJob);
    if (data.nextJob) jobs.push(data.nextJob);
    jobs.push(...data.queue);
    return jobs;
  }, [data]);

  // Convert weekPreview to jobCounts map for the calendar
  const jobCounts = useMemo(() => {
    if (!data?.weekPreview) return {};
    const counts: Record<string, number> = {};
    data.weekPreview.forEach((day) => {
      if (day.jobCount > 0) {
        counts[day.date] = day.jobCount;
      }
    });
    return counts;
  }, [data]);

  const { text: greetingText, icon: GreetingIcon } = getGreeting();

  if (loading) {
    return (
      <div className="p-4 lg:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-32 bg-gray-200 rounded" />
          <div className="h-24 bg-gray-200 rounded" />
          <div className="h-48 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 lg:p-6">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => fetchData()}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { dayStats, pendingReviewsCount, activeLeadsCount, actionItems } = data;

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-2xl mx-auto">
      {/* Search Bar */}
      <SearchBar placeholder="Search customers by name or city..." />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <GreetingIcon className="w-5 h-5 text-yellow-500" />
            <h1 className="text-xl font-semibold text-gray-900">
              {greetingText}
              {businessName ? `, ${businessName.split(' ')[0]}` : ''}
            </h1>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchData(true)}
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* 1. METRICS - Statistics Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Jobs Today - Blue */}
        <div className="relative overflow-hidden bg-blue-600 text-white rounded-xl p-4">
          <div className="relative z-10">
            <div className="text-white/70 text-xs font-medium mb-2">Today&apos;s Jobs</div>
            <div className="text-2xl font-semibold tracking-tight">
              {dayStats.totalJobs}
            </div>
          </div>
          {/* Decorative circles */}
          <svg className="absolute right-0 top-0 h-full w-2/3 pointer-events-none" viewBox="0 0 300 200" fill="none">
            <circle cx="220" cy="100" r="90" fill="#fff" fillOpacity="0.08" />
            <circle cx="260" cy="60" r="60" fill="#fff" fillOpacity="0.10" />
            <circle cx="200" cy="160" r="50" fill="#fff" fillOpacity="0.07" />
          </svg>
        </div>

        {/* Est. Revenue - Green */}
        <div className="relative overflow-hidden bg-emerald-600 text-white rounded-xl p-4">
          <div className="relative z-10">
            <div className="text-white/70 text-xs font-medium mb-2">Est. Revenue</div>
            <div className="text-2xl font-semibold tracking-tight">
              ${(dayStats.estimatedRevenue || 0).toLocaleString()}
            </div>
          </div>
          {/* Decorative circles */}
          <svg className="absolute right-0 top-0 h-full w-2/3 pointer-events-none" viewBox="0 0 300 200" fill="none">
            <circle cx="220" cy="100" r="90" fill="#fff" fillOpacity="0.08" />
            <circle cx="260" cy="60" r="60" fill="#fff" fillOpacity="0.10" />
            <circle cx="200" cy="160" r="50" fill="#fff" fillOpacity="0.07" />
          </svg>
        </div>
      </div>

      {/* 2. TODAY'S SCHEDULE */}
      <TodayScheduleSection jobs={allJobs} timezone={timezone} jobCounts={jobCounts} />

      {/* 3. ACTION ITEMS */}
      <ActionItemsSection items={actionItems} totalCount={activeLeadsCount + pendingReviewsCount} />
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { DayScheduleResponse } from '@/app/api/schedule/day/[date]/route';
import { ScheduleCalendar } from '@/components/ui/schedule-calendar';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusIcon, Phone, MapPin, Clock } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { Job } from '@/types/database';
import { useRouter } from 'next/navigation';

export default function SchedulePage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dayData, setDayData] = useState<DayScheduleResponse | null>(null);
  const [jobCounts, setJobCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [timezone, setTimezone] = useState('America/New_York');

  // Fetch job counts for the visible month
  const fetchMonthJobCounts = useCallback(async (monthDate: Date) => {
    try {
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);

      // Fetch jobs for the entire month to get counts
      const response = await fetch(`/api/schedule?weekOffset=0`);
      if (!response.ok) return;

      const data = await response.json();

      // Build job counts from days array
      const counts: Record<string, number> = {};
      if (data.days) {
        data.days.forEach((day: { date: string; jobCount: number }) => {
          if (day.jobCount > 0) {
            counts[day.date] = day.jobCount;
          }
        });
      }
      setJobCounts(counts);
    } catch (error) {
      console.error('Error fetching month job counts:', error);
    }
  }, []);

  // Fetch day data
  const fetchDayData = useCallback(async (date: Date) => {
    try {
      setLoading(true);
      const dateStr = format(date, 'yyyy-MM-dd');
      const response = await fetch(`/api/schedule/day/${dateStr}`);
      if (!response.ok) throw new Error('Failed to fetch day schedule');

      const data: DayScheduleResponse = await response.json();
      setDayData(data);
    } catch (error) {
      console.error('Error fetching day data:', error);
      setDayData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load - get timezone and fetch data
  useEffect(() => {
    // Get timezone from localStorage
    const tokenData = localStorage.getItem('supabase.auth.token');
    if (tokenData) {
      try {
        const parsed = JSON.parse(tokenData);
        const tz = parsed.user?.user_metadata?.timezone || 'America/New_York';
        setTimezone(tz);
      } catch (e) {
        console.error('Error parsing token data:', e);
      }
    }

    fetchMonthJobCounts(selectedDate);
    fetchDayData(selectedDate);
  }, []);

  // When date changes, fetch day data
  useEffect(() => {
    fetchDayData(selectedDate);
  }, [selectedDate, fetchDayData]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleMonthChange = (month: Date) => {
    fetchMonthJobCounts(month);
  };

  const handleJobClick = (jobId: string) => {
    router.push(`/jobs/${jobId}`);
  };

  const formatJobTime = (job: Job) => {
    if (!job.scheduled_at) return 'TBD';
    const jobDate = toZonedTime(parseISO(job.scheduled_at), timezone);
    return format(jobDate, 'h:mm a');
  };

  const formatServiceType = (type: string) => {
    if (type === 'hvac') return 'HVAC';
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <div className="p-4 lg:p-6">
      <Card className="py-4">
        <CardContent className="px-4">
          <ScheduleCalendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            onMonthChange={handleMonthChange}
            jobCounts={jobCounts}
            className="w-full"
          />
        </CardContent>

        <CardFooter className="flex flex-col items-start gap-4 border-t px-4 !pt-4">
          {/* Date Header */}
          <div className="flex w-full items-center justify-between">
            <div className="text-base font-semibold text-foreground">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </div>
            <Button variant="ghost" size="icon" className="size-8" title="Add Job">
              <PlusIcon className="w-4 h-4" />
              <span className="sr-only">Add Job</span>
            </Button>
          </div>

          {/* Jobs List */}
          <div className="flex w-full flex-col gap-2">
            {loading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-16 bg-gray-100 rounded-md" />
                <div className="h-16 bg-gray-100 rounded-md" />
              </div>
            ) : dayData && dayData.jobs.length > 0 ? (
              dayData.jobs.map((job) => (
                <button
                  key={job.id}
                  onClick={() => handleJobClick(job.id)}
                  className="bg-muted hover:bg-muted/80 after:bg-primary/70 relative rounded-md p-3 pl-5 text-left transition-colors after:absolute after:inset-y-3 after:left-2 after:w-1 after:rounded-full"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground truncate">
                        {formatServiceType(job.service_type)} - {job.customer_name}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatJobTime(job)}
                        </span>
                        {job.customer_address && (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{job.customer_address.split(',')[0]}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    {job.estimated_value && (
                      <div className="text-sm font-semibold text-foreground">
                        ${job.estimated_value.toLocaleString()}
                      </div>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No jobs scheduled for this day</p>
                <Button variant="outline" size="sm" className="mt-3">
                  <PlusIcon className="w-4 h-4 mr-1.5" />
                  Add Job
                </Button>
              </div>
            )}
          </div>

          {/* Day Stats */}
          {dayData && dayData.jobs.length > 0 && (
            <div className="flex w-full items-center justify-between pt-2 border-t text-sm text-muted-foreground">
              <span>{dayData.jobs.length} job{dayData.jobs.length !== 1 ? 's' : ''}</span>
              <span className="font-medium text-foreground">
                ${dayData.totalEstimatedRevenue.toLocaleString()} estimated
              </span>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

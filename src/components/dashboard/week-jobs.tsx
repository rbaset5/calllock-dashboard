'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Calendar, MapPin, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StatusBadge, UrgencyBadge, ServiceTypeBadge } from '@/components/ui/badge';
import { formatTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { startOfWeek, endOfWeek, addWeeks, format, addDays } from 'date-fns';
import type { Job } from '@/types/database';

interface WeekJobsProps {
  jobs: Job[];
  timezone: string;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function WeekJobs({ jobs, timezone }: WeekJobsProps) {
  // Week offset: 0 = current week, 1 = next week, -1 = last week
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(() => {
    const today = new Date();
    // Convert JS day (Sun=0) to our format (Mon=0)
    return (today.getDay() + 6) % 7;
  });

  // Calculate week boundaries based on offset
  const weekStart = useMemo(() => {
    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    return addWeeks(start, weekOffset);
  }, [weekOffset]);

  const weekEnd = useMemo(() => {
    return endOfWeek(weekStart, { weekStartsOn: 1 });
  }, [weekStart]);

  // Filter jobs for current week view
  const weekJobs = useMemo(() => {
    return jobs.filter(job => {
      if (!job.scheduled_at) return false;
      const jobDate = new Date(job.scheduled_at);
      return jobDate >= weekStart && jobDate <= weekEnd;
    });
  }, [jobs, weekStart, weekEnd]);

  // Group jobs by day of week (0-6, Mon-Sun)
  const jobsByDay = useMemo(() => {
    const grouped: Job[][] = [[], [], [], [], [], [], []];
    weekJobs.forEach(job => {
      if (!job.scheduled_at) return;
      const jobDate = new Date(job.scheduled_at);
      // Convert JS day (Sun=0) to our format (Mon=0)
      const dayIndex = (jobDate.getDay() + 6) % 7;
      grouped[dayIndex].push(job);
    });
    // Sort each day's jobs by time
    grouped.forEach(dayJobs => {
      dayJobs.sort((a, b) => {
        if (!a.scheduled_at || !b.scheduled_at) return 0;
        return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
      });
    });
    return grouped;
  }, [weekJobs]);

  const isCurrentWeek = weekOffset === 0;
  const today = new Date();
  const todayIndex = isCurrentWeek ? (today.getDay() + 6) % 7 : -1;

  // Get the date for the selected day
  const selectedDate = addDays(weekStart, selectedDay);
  const selectedDayJobs = jobsByDay[selectedDay] || [];

  // Total jobs in the week
  const totalWeekJobs = weekJobs.length;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 space-y-3">
        {/* Week navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setWeekOffset(w => w - 1)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              aria-label="Previous week"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <span className="font-medium text-gray-900 min-w-[180px] text-center">
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </span>
            <button
              onClick={() => setWeekOffset(w => w + 1)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              aria-label="Next week"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            {!isCurrentWeek && (
              <button
                onClick={() => {
                  setWeekOffset(0);
                  setSelectedDay((today.getDay() + 6) % 7);
                }}
                className="text-sm font-medium text-primary-600 hover:text-primary-700 px-2 py-1 rounded hover:bg-primary-50 transition-colors"
              >
                Today
              </button>
            )}
            <span className="text-sm text-gray-500">{totalWeekJobs} jobs</span>
          </div>
        </div>

        {/* Day tabs */}
        <div className="flex gap-1">
          {DAYS.map((day, i) => {
            const count = jobsByDay[i]?.length || 0;
            const isSelected = selectedDay === i;
            const isToday = todayIndex === i;

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(i)}
                className={cn(
                  'flex-1 py-2 px-1 text-center rounded-lg text-sm font-medium transition-colors',
                  isSelected
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                  isToday && !isSelected && 'ring-2 ring-primary-400 ring-offset-1'
                )}
              >
                <span className="block">{day}</span>
                <span className={cn(
                  'block text-xs mt-0.5',
                  isSelected ? 'text-primary-100' : 'text-gray-500'
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 overflow-auto">
        {/* Selected day header */}
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span className="font-medium">
              {format(selectedDate, 'EEEE, MMM d')}
            </span>
            {todayIndex === selectedDay && (
              <span className="text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded">
                Today
              </span>
            )}
          </div>
        </div>

        {/* Job list */}
        {selectedDayJobs.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No jobs scheduled</p>
            <p className="text-sm text-gray-400 mt-1">
              {format(selectedDate, 'EEEE, MMMM d')}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {selectedDayJobs.map((job) => (
              <li key={job.id}>
                <Link
                  href={`/jobs/${job.id}`}
                  className="block px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 truncate">
                          {job.customer_name}
                        </span>
                        <ServiceTypeBadge type={job.service_type} />
                        {job.urgency === 'emergency' && (
                          <UrgencyBadge urgency={job.urgency} />
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        {job.scheduled_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatTime(job.scheduled_at, timezone)}
                          </span>
                        )}
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{job.customer_address}</span>
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={job.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

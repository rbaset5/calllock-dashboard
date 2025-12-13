'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toZonedTime, format as formatTz } from 'date-fns-tz';
import { AgendaJobCard } from './agenda-job-card';
import { DateGroupHeader } from './date-group-header';
import type { Job } from '@/types/database';

interface AgendaViewProps {
  jobs: Job[];
  timezone: string;
}

interface DateGroup {
  dateKey: string; // ISO date for sorting
  displayDate: string; // For display
  jobs: Job[];
}

/** Group jobs by their scheduled date */
function groupJobsByDate(jobs: Job[], timezone: string): DateGroup[] {
  const groups: Map<string, Job[]> = new Map();

  // Sort jobs by scheduled_at first
  const sortedJobs = [...jobs].sort((a, b) => {
    if (!a.scheduled_at && !b.scheduled_at) return 0;
    if (!a.scheduled_at) return 1;
    if (!b.scheduled_at) return -1;
    return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
  });

  sortedJobs.forEach((job) => {
    if (!job.scheduled_at) return;

    const d = new Date(job.scheduled_at);
    const zonedDate = toZonedTime(d, timezone);
    // Use ISO date string as key for consistent grouping
    const dateKey = formatTz(zonedDate, 'yyyy-MM-dd', { timeZone: timezone });

    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(job);
  });

  // Convert to array and sort by date
  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, dateJobs]) => ({
      dateKey,
      displayDate: dateKey,
      jobs: dateJobs,
    }));
}

export function AgendaView({ jobs, timezone }: AgendaViewProps) {
  const router = useRouter();

  const groupedJobs = useMemo(
    () => groupJobsByDate(jobs, timezone),
    [jobs, timezone]
  );

  const handleJobClick = (jobId: string) => {
    router.push(`/jobs/${jobId}`);
  };

  if (groupedJobs.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {groupedJobs.map(({ dateKey, jobs: dateJobs }) => (
        <div key={dateKey} className="flex gap-3">
          {/* Date Header - Left Column */}
          <DateGroupHeader date={dateKey} timezone={timezone} />

          {/* Jobs - Right Column */}
          <div className="flex-1 space-y-3">
            {dateJobs.map((job) => (
              <AgendaJobCard
                key={job.id}
                job={job}
                timezone={timezone}
                onClick={() => handleJobClick(job.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { Calendar, MapPin, Clock, DollarSign } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StatusBadge, UrgencyBadge, ServiceTypeBadge } from '@/components/ui/badge';
import { formatTime, formatScheduleTime } from '@/lib/format';
import { formatServiceType } from '@/lib/utils';
import type { Job } from '@/types/database';

interface TodayJobsProps {
  jobs: Job[];
  timezone: string;
}

export function TodayJobs({ jobs, timezone }: TodayJobsProps) {
  // Sort by scheduled time
  const sortedJobs = [...jobs].sort((a, b) => {
    if (!a.scheduled_at) return 1;
    if (!b.scheduled_at) return -1;
    return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
  });

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between flex-shrink-0">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-500" />
          Today&apos;s Jobs
        </CardTitle>
        <span className="text-sm text-gray-500">{jobs.length} scheduled</span>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-auto">
        {sortedJobs.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No jobs scheduled for today</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {sortedJobs.map((job) => (
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
                        {job.estimated_value && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <DollarSign className="w-3 h-3" />
                            {job.estimated_value.toLocaleString()}
                          </span>
                        )}
                        <ServiceTypeBadge type={job.service_type} />
                        {job.urgency === 'emergency' && <UrgencyBadge urgency={job.urgency} />}
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

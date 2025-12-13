'use client';

import { Job } from '@/types/database';
import { UrgencyBadge } from '@/components/ui/badge';
import { Clock, Flame } from 'lucide-react';
import { formatScheduleTime } from '@/lib/format';
import Link from 'next/link';

interface JobQueueListProps {
  jobs: Job[];
  timezone: string;
}

export function JobQueueList({ jobs, timezone }: JobQueueListProps) {
  if (jobs.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border">
      <div className="px-4 py-3 border-b bg-gray-50 rounded-t-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            Up Next ({jobs.length} more today)
          </span>
        </div>
      </div>
      <div className="divide-y">
        {jobs.map((job) => (
          <Link
            key={job.id}
            href={`/jobs/${job.id}`}
            className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {job.scheduled_at && (
                  <span className="text-sm font-medium text-gray-900 whitespace-nowrap">
                    {formatScheduleTime(job.scheduled_at, timezone, { timeOnly: true })}
                  </span>
                )}
                <span className="text-sm text-gray-700 truncate">
                  {job.customer_name}
                </span>
                {job.urgency === 'emergency' && (
                  <Flame className="w-4 h-4 text-red-500 flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-gray-500 truncate mt-0.5">
                {job.ai_summary || 'HVAC Service'} &middot; {job.customer_address.split(',')[0]}
              </p>
            </div>
            <div className="flex items-center gap-2 ml-3">
              {job.estimated_value && (
                <span className="text-sm font-medium text-green-700">
                  ${job.estimated_value.toLocaleString()}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
      {/* Day Total */}
      <div className="px-4 py-3 border-t bg-gray-50 rounded-b-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Day total (estimated)</span>
          <span className="text-sm font-semibold text-gray-900">
            ${jobs.reduce((sum, j) => sum + (j.estimated_value || 0), 0).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

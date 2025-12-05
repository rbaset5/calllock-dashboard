'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { formatRelativeTime } from '@/lib/format';
import type { Job } from '@/types/database';

interface NeedsActionAlertProps {
  jobs: Job[];
}

export function NeedsActionAlert({ jobs }: NeedsActionAlertProps) {
  if (jobs.length === 0) return null;

  // Sort by oldest first
  const sortedJobs = [...jobs].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const oldestJob = sortedJobs[0];

  return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg h-full">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-red-800">
            {jobs.length} {jobs.length === 1 ? 'job needs' : 'jobs need'} attention
          </h3>
          <p className="text-sm text-red-700 mt-1">
            Oldest: {oldestJob.customer_name} ({formatRelativeTime(oldestJob.created_at)})
          </p>
          <Link
            href="/jobs?needs_action=true"
            className="inline-block mt-2 text-sm font-medium text-red-700 hover:text-red-800 underline"
          >
            View all
          </Link>
        </div>
      </div>
    </div>
  );
}

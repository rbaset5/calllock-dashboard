'use client';

import Link from 'next/link';
import { Clock } from 'lucide-react';
import type { Job } from '@/types/database';

interface StaleJobsWarningProps {
  jobs: Job[];
}

export function StaleJobsWarning({ jobs }: StaleJobsWarningProps) {
  if (jobs.length === 0) return null;

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
            <Clock className="w-5 h-5 text-yellow-600" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-yellow-800">
            {jobs.length} unconfirmed {jobs.length === 1 ? 'job' : 'jobs'} (24+ hours)
          </h3>
          <p className="text-sm text-yellow-700 mt-1">
            Jobs in &quot;new&quot; status may slip through the cracks
          </p>
          <Link
            href="/jobs?status=new"
            className="inline-block mt-2 text-sm font-medium text-yellow-700 hover:text-yellow-800 underline"
          >
            Review jobs
          </Link>
        </div>
      </div>
    </div>
  );
}

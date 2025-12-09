'use client';

import Link from 'next/link';
import { MapPin, Clock, AlertTriangle, Phone, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge, UrgencyBadge, ServiceTypeBadge } from '@/components/ui/badge';
import { formatScheduleTime } from '@/lib/format';
import { formatPhone } from '@/lib/utils';
import type { Job } from '@/types/database';

interface JobCardProps {
  job: Job;
  timezone: string;
}

export function JobCard({ job, timezone }: JobCardProps) {
  return (
    <Link href={`/jobs/${job.id}`}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Header row */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-900 truncate">
                  {job.customer_name}
                </span>
                {job.estimated_value && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <DollarSign className="w-3 h-3" />
                    {job.estimated_value.toLocaleString()}
                  </span>
                )}
                {job.needs_action && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                    <AlertTriangle className="w-3 h-3" />
                    Needs Action
                  </span>
                )}
              </div>

              {/* Badges row */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <ServiceTypeBadge type={job.service_type} />
                <UrgencyBadge urgency={job.urgency} />
                <StatusBadge status={job.status} />
              </div>

              {/* Details */}
              <div className="mt-3 space-y-1 text-sm text-gray-500">
                {job.scheduled_at && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    <span>{formatScheduleTime(job.scheduled_at, timezone)}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{job.customer_address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 flex-shrink-0" />
                  <span>{formatPhone(job.customer_phone)}</span>
                </div>
              </div>

              {/* AI Summary preview */}
              {job.ai_summary && (
                <p className="mt-3 text-sm text-gray-600 line-clamp-2">
                  {job.ai_summary}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

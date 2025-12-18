'use client';

import Link from 'next/link';
import { Calendar, Clock, MapPin, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UrgencyBadge } from '@/components/ui/badge';
import { formatScheduleTime } from '@/lib/format';
import type { Job } from '@/types/database';

interface UpcomingAppointmentCardProps {
  job: Job;
  timezone: string;
}

export function UpcomingAppointmentCard({ job, timezone }: UpcomingAppointmentCardProps) {
  return (
    <Card className="border-primary-200 bg-primary-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 text-primary-700">
          <Calendar className="w-5 h-5" />
          Upcoming Appointment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Date/Time */}
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary-600" />
          <span className="font-medium text-gray-900">
            {job.scheduled_at ? formatScheduleTime(job.scheduled_at, timezone) : 'Not scheduled'}
          </span>
          <UrgencyBadge urgency={job.urgency} />
        </div>

        {/* Issue Description */}
        {job.ai_summary && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {job.ai_summary}
          </p>
        )}

        {/* Address */}
        {job.customer_address && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <MapPin className="w-4 h-4" />
            <span className="truncate">{job.customer_address}</span>
          </div>
        )}

        {/* Actions */}
        <div className="pt-2">
          <Link href={`/jobs/${job.id}`}>
            <Button variant="default" size="sm" className="w-full">
              View Job Details
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

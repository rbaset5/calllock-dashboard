'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { StaticMapPreview } from '@/components/ui/static-map-preview';
import { MapPin, Users } from 'lucide-react';
import { formatScheduleTime } from '@/lib/format';
import { toZonedTime, format as formatTz } from 'date-fns-tz';
import type { Job } from '@/types/database';

interface AgendaJobCardProps {
  job: Job;
  timezone: string;
  onClick?: () => void;
}

/** Format time split into time and period for display */
function formatTimeSplit(
  date: string | Date,
  timezone: string
): { time: string; period: string } {
  const d = typeof date === 'string' ? new Date(date) : date;
  const zonedDate = toZonedTime(d, timezone);
  const time = formatTz(zonedDate, 'h:mm', { timeZone: timezone });
  const period = formatTz(zonedDate, 'a', { timeZone: timezone }).toLowerCase();
  return { time, period };
}

/** Get status badge style */
function getStatusBadgeStyle(status: string): string {
  const styles: Record<string, string> = {
    new: 'bg-blue-100 text-blue-700',
    confirmed: 'bg-indigo-100 text-indigo-700',
    en_route: 'bg-amber-100 text-amber-700',
    on_site: 'bg-yellow-100 text-yellow-800',
    complete: 'bg-green-100 text-green-700',
    cancelled: 'bg-gray-100 text-gray-600',
  };
  return styles[status] || 'bg-gray-100 text-gray-600';
}

/** Format status for display */
function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    new: 'New',
    confirmed: 'Confirmed',
    en_route: 'En Route',
    on_site: 'On Site',
    complete: 'Complete',
    cancelled: 'Cancelled',
  };
  return labels[status] || status;
}

/** Format service type for display */
function formatServiceType(type: string): string {
  const labels: Record<string, string> = {
    hvac: 'HVAC SERVICE',
    plumbing: 'PLUMBING',
    electrical: 'ELECTRICAL',
    general: 'GENERAL SERVICE',
  };
  return labels[type] || type.toUpperCase();
}

/** Generate a short job reference from UUID */
function getJobRef(id: string): string {
  return id.slice(0, 6).toUpperCase();
}

/** Format duration from milliseconds */
function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes < 60) {
    return `${totalMinutes}min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

export const AgendaJobCard = React.forwardRef<HTMLDivElement, AgendaJobCardProps>(
  ({ job, timezone, onClick }, ref) => {
    // Calculate duration if job has started
    const duration = job.started_at
      ? formatDuration(
          (job.completed_at ? new Date(job.completed_at).getTime() : Date.now()) -
            new Date(job.started_at).getTime()
        )
      : null;

    // Get time parts if scheduled
    const timeParts = job.scheduled_at
      ? formatTimeSplit(job.scheduled_at, timezone)
      : null;

    return (
      <Card
        ref={ref}
        onClick={onClick}
        className="overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
      >
        {/* Map Preview - Full Width at Top */}
        <StaticMapPreview
          address={job.customer_address}
          className="w-full h-20 object-cover"
          zoom={13}
        />

        {/* Horizontal Layout - Blue Time Block + Content */}
        <div className="flex">
          {/* Left Blue Time Block */}
          <div className="w-16 bg-indigo-600 text-white p-2 flex flex-col justify-between shrink-0">
            {timeParts ? (
              <div className="text-center">
                <div className="text-base font-bold leading-tight">{timeParts.time}</div>
                <div className="text-[10px] opacity-80">{timeParts.period}</div>
              </div>
            ) : (
              <div className="text-center text-[10px] opacity-80">TBD</div>
            )}

            {duration && (
              <div className="text-center text-xs font-medium">{duration}</div>
            )}

            <div className="text-center text-[9px] opacity-70">{getJobRef(job.id)}</div>
          </div>

          {/* Content Area */}
          <div className="flex-1 p-3">
            {/* Header: Job ID + DateTime */}
            <div className="flex justify-between items-center text-[10px] text-muted-foreground mb-1">
              <span>Job {getJobRef(job.id)}</span>
              <span>
                {job.scheduled_at
                  ? formatScheduleTime(job.scheduled_at, timezone)
                  : 'Unscheduled'}
              </span>
            </div>

            {/* Service Type */}
            <h3 className="font-semibold text-sm text-foreground mb-1">
              {formatServiceType(job.service_type)}
            </h3>

            {/* Customer Name + Location Pin */}
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-sm text-foreground font-medium">
                {job.customer_name}
              </span>
              <MapPin className="w-4 h-4 text-blue-500" />
            </div>

            {/* Address */}
            <p className="text-[11px] text-muted-foreground truncate mb-2">
              {job.customer_address}
            </p>

            {/* Footer: Crew + Status */}
            <div className="flex items-center justify-between text-xs pt-1.5 border-t">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${getStatusBadgeStyle(job.status)}`}>
                {formatStatus(job.status)}
              </span>
            </div>
          </div>
        </div>
      </Card>
    );
  }
);

AgendaJobCard.displayName = 'AgendaJobCard';

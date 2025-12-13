'use client';

import * as React from 'react';
import { Job, UrgencyLevel } from '@/types/database';
import { Card } from '@/components/ui/card';
import {
  DropDrawer,
  DropDrawerTrigger,
  DropDrawerContent,
  DropDrawerItem,
  DropDrawerSeparator,
  DropDrawerLabel,
} from '@/components/ui/dropdrawer';
import { Phone, Navigation, Eye, Truck } from 'lucide-react';
import { StaticMapPreview } from '@/components/ui/static-map-preview';
import { formatDate } from '@/lib/format';
import { toZonedTime, format as formatTz } from 'date-fns-tz';
import { getMapUrl } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface NextJobPreviewProps {
  job: Job;
  timezone: string;
  onStartTravel: (jobId: string) => void;
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

/** Generate a short job reference from UUID */
function getJobRef(id: string): string {
  return id.slice(0, 6).toUpperCase();
}

/** Get status color for badge */
function getStatusBadgeStyle(status: string): string {
  const styles: Record<string, string> = {
    new: 'bg-blue-500 text-white',
    confirmed: 'bg-indigo-500 text-white',
  };
  return styles[status] || 'bg-gray-400 text-white';
}

/** Format status for display */
function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    new: 'NEW',
    confirmed: 'CONFIRMED',
  };
  return labels[status] || status.toUpperCase();
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

/** Urgency indicator dots */
function UrgencyDots({ urgency }: { urgency: UrgencyLevel }) {
  const config: Record<UrgencyLevel, { count: number; color: string }> = {
    low: { count: 1, color: 'bg-gray-400' },
    medium: { count: 2, color: 'bg-yellow-500' },
    high: { count: 3, color: 'bg-orange-500' },
    emergency: { count: 4, color: 'bg-red-500' },
  };
  const { count, color } = config[urgency] || config.low;

  return (
    <div className="flex gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className={`w-2 h-2 rounded-full ${color}`} />
      ))}
    </div>
  );
}

const NextJobPreviewInner = React.forwardRef<
  HTMLDivElement,
  { job: Job; timezone: string }
>(({ job, timezone }, ref) => {
  // Get time parts if scheduled
  const timeParts = job.scheduled_at
    ? formatTimeSplit(job.scheduled_at, timezone)
    : null;

  return (
    <Card
      ref={ref}
      className="rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
    >
      {/* Map Preview */}
      <StaticMapPreview
        address={job.customer_address}
        className="w-full h-24 object-cover"
        zoom={13}
      />

      {/* Horizontal Layout */}
      <div className="flex">
        {/* Left Blue Time Block */}
        <div className="w-20 bg-indigo-600 text-white p-3 flex flex-col justify-between min-h-[120px]">
          {timeParts ? (
            <div className="text-center">
              <div className="text-lg font-bold leading-tight">{timeParts.time}</div>
              <div className="text-xs opacity-80">{timeParts.period}</div>
            </div>
          ) : (
            <div className="text-center text-xs opacity-80">TBD</div>
          )}

          {/* Empty middle space for pending jobs */}
          <div />

          <div className="text-center text-[10px] opacity-70">{getJobRef(job.id)}</div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 p-3">
          {/* Urgency Dots */}
          <div className="mb-2">
            <UrgencyDots urgency={job.urgency} />
          </div>

          {/* Customer Name */}
          <h3 className="font-bold text-base text-foreground leading-tight">
            {job.customer_name}
          </h3>

          {/* Date */}
          <p className="text-xs text-muted-foreground mb-2">
            {job.scheduled_at ? formatDate(job.scheduled_at, timezone) : 'Unscheduled'}
          </p>

          {/* Service Type */}
          <p className="font-semibold text-sm text-foreground uppercase">
            {formatServiceType(job.service_type)}
          </p>

          {/* Status Badge */}
          <div className="mt-2">
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded ${getStatusBadgeStyle(job.status)}`}
            >
              {formatStatus(job.status)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
});

NextJobPreviewInner.displayName = 'NextJobPreviewInner';

export function NextJobPreview({ job, timezone, onStartTravel }: NextJobPreviewProps) {
  const router = useRouter();

  const handleCall = () => {
    window.location.href = `tel:${job.customer_phone}`;
  };

  const handleNavigate = () => {
    window.open(getMapUrl(job.customer_address), '_blank');
  };

  const handleViewDetails = () => {
    router.push(`/jobs/${job.id}`);
  };

  const handleStartTravel = () => {
    onStartTravel(job.id);
  };

  return (
    <DropDrawer>
      <DropDrawerTrigger asChild>
        <div>
          <NextJobPreviewInner job={job} timezone={timezone} />
        </div>
      </DropDrawerTrigger>
      <DropDrawerContent
        title={job.customer_name}
        description={job.ai_summary || 'Job actions'}
      >
        <DropDrawerLabel>Actions</DropDrawerLabel>

        {/* Primary Action */}
        <DropDrawerItem onClick={handleStartTravel}>
          <Truck className="w-4 h-4" />
          <span>En Route</span>
        </DropDrawerItem>

        <DropDrawerSeparator />

        <DropDrawerItem onClick={handleCall}>
          <Phone className="w-4 h-4" />
          <span>Call Customer</span>
        </DropDrawerItem>

        <DropDrawerItem onClick={handleNavigate}>
          <Navigation className="w-4 h-4" />
          <span>Navigate to Location</span>
        </DropDrawerItem>

        <DropDrawerSeparator />

        <DropDrawerItem onClick={handleViewDetails}>
          <Eye className="w-4 h-4" />
          <span>View Details</span>
        </DropDrawerItem>
      </DropDrawerContent>
    </DropDrawer>
  );
}

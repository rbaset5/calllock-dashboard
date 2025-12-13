'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
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
import { Phone, Navigation, CheckCircle, Wrench, Eye } from 'lucide-react';
import { StaticMapPreview } from '@/components/ui/static-map-preview';
import { formatDate } from '@/lib/format';
import { toZonedTime, format as formatTz } from 'date-fns-tz';
import { getMapUrl } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface CurrentJobCardProps {
  job: Job;
  timezone: string;
  onStatusChange: (jobId: string, newStatus: string) => void;
  onComplete: (jobId: string) => void;
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

/** Format duration from seconds */
function formatDuration(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60);
  if (totalMinutes < 60) {
    return `${totalMinutes}min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

/** Generate a short job reference from UUID */
function getJobRef(id: string): string {
  return id.slice(0, 6).toUpperCase();
}

/** Get status color for badge */
function getStatusBadgeStyle(status: string): string {
  const styles: Record<string, string> = {
    en_route: 'bg-amber-500 text-white',
    on_site: 'bg-yellow-500 text-black',
  };
  return styles[status] || 'bg-gray-400 text-white';
}

/** Format status for display */
function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    en_route: 'EN ROUTE',
    on_site: 'ON SITE',
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

const CurrentJobCardInner = React.forwardRef<
  HTMLDivElement,
  { job: Job; timezone: string; elapsedTime: number }
>(({ job, timezone, elapsedTime }, ref) => {
  // Get time parts if scheduled
  const timeParts = job.scheduled_at
    ? formatTimeSplit(job.scheduled_at, timezone)
    : null;

  return (
    <Card
      ref={ref}
      className="overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
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

          {elapsedTime > 0 && (
            <div className="text-center text-sm font-medium">
              {formatDuration(elapsedTime)}
            </div>
          )}

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

CurrentJobCardInner.displayName = 'CurrentJobCardInner';

export function CurrentJobCard({
  job,
  timezone,
  onStatusChange,
  onComplete,
}: CurrentJobCardProps) {
  const router = useRouter();
  const [elapsedTime, setElapsedTime] = useState(0);

  const isEnRoute = job.status === 'en_route';
  const isOnSite = job.status === 'on_site';

  // Timer for on-site duration
  useEffect(() => {
    if (job.status !== 'on_site' || !job.started_at) return;

    const startTime = new Date(job.started_at).getTime();
    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedTime(elapsed);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [job.status, job.started_at]);

  const handleCall = () => {
    window.location.href = `tel:${job.customer_phone}`;
  };

  const handleNavigate = () => {
    window.open(getMapUrl(job.customer_address), '_blank');
  };

  const handleViewDetails = () => {
    router.push(`/jobs/${job.id}`);
  };

  const handleStartJob = () => {
    onStatusChange(job.id, 'on_site');
  };

  const handleCompleteJob = () => {
    onComplete(job.id);
  };

  return (
    <DropDrawer>
      <DropDrawerTrigger asChild>
        <div>
          <CurrentJobCardInner job={job} timezone={timezone} elapsedTime={elapsedTime} />
        </div>
      </DropDrawerTrigger>
      <DropDrawerContent
        title={job.customer_name}
        description={job.ai_summary || 'Job actions'}
      >
        <DropDrawerLabel>Actions</DropDrawerLabel>

        {/* Primary Action based on status */}
        {isEnRoute && (
          <DropDrawerItem onClick={handleStartJob}>
            <Wrench className="w-4 h-4" />
            <span>Start Job</span>
          </DropDrawerItem>
        )}
        {isOnSite && (
          <DropDrawerItem onClick={handleCompleteJob}>
            <CheckCircle className="w-4 h-4" />
            <span>Complete Job</span>
          </DropDrawerItem>
        )}

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

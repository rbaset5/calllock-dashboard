'use client';

import { format, parseISO } from 'date-fns';
import { Building2 } from 'lucide-react';
import { Job } from '@/types/database';
import Link from 'next/link';

interface TodayAppointmentItemProps {
  job: Job;
  isFirst?: boolean;
  isLast?: boolean;
}

function formatTimeRange(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    const startTime = format(date, 'h:mm');
    // Assume 1 hour appointment duration
    const endDate = new Date(date.getTime() + 60 * 60 * 1000);
    const endTime = format(endDate, 'h:mm a');
    return `${startTime} - ${endTime}`;
  } catch {
    return '';
  }
}

function formatDayNumber(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'd');
  } catch {
    return '';
  }
}

function formatMonth(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMM').toUpperCase();
  } catch {
    return '';
  }
}

function formatReferenceId(id: string): string {
  const shortId = id.replace(/-/g, '').slice(-5).toUpperCase();
  return `#RSV${shortId}`;
}

const serviceTypeLabels: Record<string, string> = {
  hvac: 'HVAC Service',
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  general: 'Service',
};

export function TodayAppointmentItem({
  job,
  isFirst = false,
  isLast = false
}: TodayAppointmentItemProps) {
  const timeRange = job.scheduled_at ? formatTimeRange(job.scheduled_at) : '';
  const dayNumber = job.scheduled_at ? formatDayNumber(job.scheduled_at) : '';
  const month = job.scheduled_at ? formatMonth(job.scheduled_at) : '';
  const referenceId = formatReferenceId(job.id);
  const serviceLabel = serviceTypeLabels[job.service_type] || 'Service';

  return (
    <div className="flex gap-4">
      {/* Timeline - Date indicator */}
      <div className="flex flex-col items-center w-12 flex-shrink-0">
        {/* Connector line above (hidden for first item) */}
        {!isFirst && <div className="w-0.5 h-2 bg-navy-200" />}

        {/* Date circle */}
        <div className="w-10 h-10 rounded-full bg-navy-600 text-white flex items-center justify-center font-semibold text-sm">
          {dayNumber}
        </div>

        {/* Month label */}
        <span className="text-[10px] font-medium text-navy-400 mt-0.5">{month}</span>

        {/* Connector line below (hidden for last item) */}
        {!isLast && <div className="w-0.5 flex-1 min-h-4 bg-navy-200 mt-1" />}
      </div>

      {/* Appointment Card */}
      <Link
        href={`/jobs/${job.id}`}
        className="flex-1 bg-white border border-navy-100 rounded-xl p-4 mb-3 hover:border-navy-300 hover:shadow-sm transition-all"
      >
        {/* Time and Reference ID */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-navy-700">{timeRange}</span>
          <span className="text-xs text-navy-400">{referenceId}</span>
        </div>

        {/* Service Type */}
        <div className="flex items-center gap-2 mb-2">
          <span className="font-semibold text-navy-800">{serviceLabel}</span>
        </div>

        {/* Description */}
        {job.ai_summary && (
          <p className="text-sm text-navy-500 mb-2 line-clamp-1">
            {job.ai_summary}
          </p>
        )}

        {/* Location */}
        <div className="flex items-center gap-1.5 text-sm text-navy-400">
          <Building2 className="w-3.5 h-3.5" />
          <span className="truncate">{job.customer_name}</span>
        </div>
      </Link>
    </div>
  );
}

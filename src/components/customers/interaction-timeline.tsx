'use client';

import Link from 'next/link';
import {
  CheckCircle,
  Calendar,
  XCircle,
  PhoneIncoming,
  PhoneMissed,
  Voicemail,
  MessageSquare,
  Clock,
  DollarSign,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Job, Lead, SmsLog } from '@/types/database';

interface InteractionTimelineProps {
  jobs: Job[];
  leads: Lead[];
  smsLogs: SmsLog[];
  timezone: string;
}

// Unified timeline item type
type TimelineItemType = 'job' | 'lead' | 'sms';

interface TimelineItem {
  id: string;
  type: TimelineItemType;
  date: string;
  data: Job | Lead | SmsLog;
}

// Get icon and color based on job status
function getJobIcon(status: Job['status']) {
  switch (status) {
    case 'complete':
      return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' };
    case 'cancelled':
      return { icon: XCircle, color: 'text-gray-400', bg: 'bg-gray-100' };
    default:
      return { icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-100' };
  }
}

// Get icon and color based on lead status
function getLeadIcon(status: Lead['status']) {
  switch (status) {
    case 'abandoned':
      return { icon: PhoneMissed, color: 'text-red-600', bg: 'bg-red-100' };
    case 'callback_requested':
    case 'thinking':
      return { icon: PhoneIncoming, color: 'text-yellow-600', bg: 'bg-yellow-100' };
    case 'voicemail_left':
      return { icon: Voicemail, color: 'text-orange-600', bg: 'bg-orange-100' };
    case 'converted':
      return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' };
    case 'lost':
      return { icon: XCircle, color: 'text-gray-400', bg: 'bg-gray-100' };
    default:
      return { icon: PhoneIncoming, color: 'text-blue-600', bg: 'bg-blue-100' };
  }
}

// Get label for lead status
function getLeadStatusLabel(status: Lead['status']): string {
  const labels: Record<Lead['status'], string> = {
    callback_requested: 'Callback Requested',
    thinking: 'Thinking It Over',
    voicemail_left: 'Voicemail Left',
    info_only: 'Info Only',
    deferred: 'Deferred',
    converted: 'Converted to Job',
    lost: 'Lost',
    abandoned: 'Missed Call',
  };
  return labels[status] || status;
}

function JobTimelineItem({ job }: { job: Job }) {
  const { icon: Icon, color, bg } = getJobIcon(job.status);
  const isComplete = job.status === 'complete';
  const isCancelled = job.status === 'cancelled';

  return (
    <Link href={`/jobs/${job.id}`} className="block">
      <div className="flex gap-3 p-3 rounded-lg hover:bg-gray-50 transition">
        <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0', bg)}>
          <Icon className={cn('w-5 h-5', color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('font-medium', isCancelled ? 'text-gray-500' : 'text-gray-900')}>
              {isComplete ? 'Completed Job' : isCancelled ? 'Cancelled Job' : 'Scheduled Job'}
            </span>
            {isComplete && job.revenue && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                {job.revenue.toLocaleString()}
              </span>
            )}
          </div>
          {job.ai_summary && (
            <p className="text-sm text-gray-600 line-clamp-1 mt-0.5">
              {job.ai_summary}
            </p>
          )}
          <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
            <Clock className="w-3 h-3" />
            {job.scheduled_at
              ? format(new Date(job.scheduled_at), 'MMM d, yyyy h:mm a')
              : formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
          </div>
        </div>
      </div>
    </Link>
  );
}

function LeadTimelineItem({ lead }: { lead: Lead }) {
  const { icon: Icon, color, bg } = getLeadIcon(lead.status);
  const statusLabel = getLeadStatusLabel(lead.status);

  return (
    <Link href={`/leads/${lead.id}`} className="block">
      <div className="flex gap-3 p-3 rounded-lg hover:bg-gray-50 transition">
        <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0', bg)}>
          <Icon className={cn('w-5 h-5', color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">Call - {statusLabel}</span>
          </div>
          {lead.issue_description && (
            <p className="text-sm text-gray-600 line-clamp-1 mt-0.5">
              {lead.issue_description}
            </p>
          )}
          {lead.why_not_booked && (
            <p className="text-xs text-gray-500 italic mt-0.5">
              {lead.why_not_booked}
            </p>
          )}
          <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
          </div>
        </div>
      </div>
    </Link>
  );
}

function SmsTimelineItem({ sms }: { sms: SmsLog }) {
  const isInbound = sms.direction === 'inbound';
  const color = isInbound ? 'text-green-600' : 'text-blue-600';
  const bg = isInbound ? 'bg-green-100' : 'bg-blue-100';

  return (
    <div className="flex gap-3 p-3 rounded-lg hover:bg-gray-50 transition">
      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0', bg)}>
        <MessageSquare className={cn('w-5 h-5', color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">
            SMS {isInbound ? 'Received' : 'Sent'}
          </span>
          {sms.delivery_status && (
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded',
              sms.delivery_status === 'delivered' ? 'bg-green-100 text-green-700' :
              sms.delivery_status === 'failed' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-600'
            )}>
              {sms.delivery_status}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 line-clamp-2 mt-0.5">
          {sms.body}
        </p>
        <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
          <Clock className="w-3 h-3" />
          {formatDistanceToNow(new Date(sms.created_at), { addSuffix: true })}
        </div>
      </div>
    </div>
  );
}

export function InteractionTimeline({ jobs, leads, smsLogs, timezone }: InteractionTimelineProps) {
  // Combine all items into a single timeline
  const timelineItems: TimelineItem[] = [
    ...jobs.map(job => ({
      id: `job-${job.id}`,
      type: 'job' as const,
      date: job.scheduled_at || job.created_at,
      data: job,
    })),
    ...leads.map(lead => ({
      id: `lead-${lead.id}`,
      type: 'lead' as const,
      date: lead.created_at,
      data: lead,
    })),
    ...smsLogs.map(sms => ({
      id: `sms-${sms.id}`,
      type: 'sms' as const,
      date: sms.created_at,
      data: sms,
    })),
  ];

  // Sort by date, most recent first
  timelineItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (timelineItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Interaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 text-center py-4">
            No interactions yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Interaction History</CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-gray-100 -mx-2">
        {timelineItems.slice(0, 20).map(item => {
          switch (item.type) {
            case 'job':
              return <JobTimelineItem key={item.id} job={item.data as Job} />;
            case 'lead':
              return <LeadTimelineItem key={item.id} lead={item.data as Lead} />;
            case 'sms':
              return <SmsTimelineItem key={item.id} sms={item.data as SmsLog} />;
            default:
              return null;
          }
        })}
      </CardContent>
    </Card>
  );
}

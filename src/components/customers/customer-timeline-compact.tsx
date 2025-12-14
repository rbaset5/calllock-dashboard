'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle,
  Calendar,
  XCircle,
  PhoneIncoming,
  PhoneMissed,
  MessageSquare,
  Clock,
  History,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Job, Lead, SmsLog, Call } from '@/types/database';

interface CustomerTimelineCompactProps {
  phone: string;
  limit?: number;
}

interface TimelineData {
  found: boolean;
  customer?: { id: string };
  serviceHistory?: Job[];
  leads?: Lead[];
  recentSms?: SmsLog[];
  calls?: Call[];
}

type TimelineItemType = 'job' | 'lead' | 'sms' | 'call';

interface TimelineItem {
  id: string;
  type: TimelineItemType;
  date: string;
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  href?: string;
}

function getJobTimelineItem(job: Job): TimelineItem {
  const isComplete = job.status === 'complete';
  const isCancelled = job.status === 'cancelled';

  return {
    id: `job-${job.id}`,
    type: 'job',
    date: job.scheduled_at || job.created_at,
    title: isComplete ? 'Completed Job' : isCancelled ? 'Cancelled Job' : 'Scheduled Job',
    subtitle: job.ai_summary || undefined,
    icon: isComplete ? CheckCircle : isCancelled ? XCircle : Calendar,
    iconColor: isComplete ? 'text-green-600' : isCancelled ? 'text-gray-400' : 'text-blue-600',
    iconBg: isComplete ? 'bg-green-100' : isCancelled ? 'bg-gray-100' : 'bg-blue-100',
    href: `/jobs/${job.id}`,
  };
}

function getLeadTimelineItem(lead: Lead): TimelineItem {
  const statusLabels: Record<string, string> = {
    callback_requested: 'Callback Requested',
    thinking: 'Thinking It Over',
    voicemail_left: 'Voicemail Left',
    converted: 'Converted to Job',
    lost: 'Lost Lead',
    abandoned: 'Missed Call',
    sales_opportunity: 'Sales Lead',
  };

  const isAbandoned = lead.status === 'abandoned';
  const isLost = lead.status === 'lost';

  return {
    id: `lead-${lead.id}`,
    type: 'lead',
    date: lead.created_at,
    title: statusLabels[lead.status] || 'Lead',
    subtitle: lead.issue_description || undefined,
    icon: isAbandoned ? PhoneMissed : isLost ? XCircle : PhoneIncoming,
    iconColor: isAbandoned ? 'text-red-600' : isLost ? 'text-gray-400' : 'text-yellow-600',
    iconBg: isAbandoned ? 'bg-red-100' : isLost ? 'bg-gray-100' : 'bg-yellow-100',
    href: `/leads/${lead.id}`,
  };
}

function getSmsTimelineItem(sms: SmsLog): TimelineItem {
  const isInbound = sms.direction === 'inbound';

  return {
    id: `sms-${sms.id}`,
    type: 'sms',
    date: sms.created_at,
    title: `SMS ${isInbound ? 'Received' : 'Sent'}`,
    subtitle: sms.body?.slice(0, 60) + (sms.body && sms.body.length > 60 ? '...' : ''),
    icon: MessageSquare,
    iconColor: isInbound ? 'text-green-600' : 'text-blue-600',
    iconBg: isInbound ? 'bg-green-100' : 'bg-blue-100',
  };
}

function getCallTimelineItem(call: Call): TimelineItem {
  const outcomeLabels: Record<string, string> = {
    completed: 'Booked',
    callback_later: 'Callback Later',
    sales_lead: 'Sales Lead',
    customer_hangup: 'Hung Up',
    wrong_number: 'Wrong Number',
    out_of_area: 'Out of Area',
  };

  const isBooked = call.outcome === 'completed';
  const isNegative = ['customer_hangup', 'wrong_number', 'out_of_area'].includes(call.outcome || '');

  return {
    id: `call-${call.id}`,
    type: 'call',
    date: call.started_at || call.created_at,
    title: `Call - ${outcomeLabels[call.outcome || ''] || call.outcome || 'Unknown'}`,
    subtitle: call.hvac_issue_type || undefined,
    icon: isBooked ? CheckCircle : isNegative ? XCircle : PhoneIncoming,
    iconColor: isBooked ? 'text-green-600' : isNegative ? 'text-gray-400' : 'text-blue-600',
    iconBg: isBooked ? 'bg-green-100' : isNegative ? 'bg-gray-100' : 'bg-blue-100',
    href: `/calls/${call.id}`,
  };
}

export function CustomerTimelineCompact({ phone, limit = 5 }: CustomerTimelineCompactProps) {
  const [data, setData] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTimeline() {
      if (!phone) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ phone });
        const response = await fetch(`/api/customers/by-phone?${params.toString()}`);
        const result = await response.json();

        if (!response.ok) {
          setError(result.error || 'Failed to fetch timeline');
          return;
        }

        setData(result);
      } catch (err) {
        setError('Failed to load timeline');
      } finally {
        setLoading(false);
      }
    }

    fetchTimeline();
  }, [phone]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="w-4 h-4" />
            Interaction Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-1/2" />
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="w-4 h-4" />
            Interaction Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data?.found) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="w-4 h-4" />
            Interaction Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 italic">No history for this phone number</p>
        </CardContent>
      </Card>
    );
  }

  // Build timeline items
  const timelineItems: TimelineItem[] = [
    ...(data.serviceHistory || []).map(getJobTimelineItem),
    ...(data.leads || []).map(getLeadTimelineItem),
    ...(data.recentSms || []).map(getSmsTimelineItem),
    ...(data.calls || []).map(getCallTimelineItem),
  ];

  // Sort by date, most recent first
  timelineItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const displayItems = timelineItems.slice(0, limit);
  const hasMore = timelineItems.length > limit;

  if (displayItems.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="w-4 h-4" />
            Interaction Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 italic">No interactions recorded</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="w-4 h-4" />
          Interaction Timeline
        </CardTitle>
        {hasMore && data.customer && (
          <Link
            href={`/customers/${data.customer.id}`}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            View All
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {displayItems.map(item => {
          const Icon = item.icon;
          const content = (
            <div className="flex gap-3 p-2 rounded-lg hover:bg-gray-50 transition">
              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', item.iconBg)}>
                <Icon className={cn('w-4 h-4', item.iconColor)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{item.title}</p>
                {item.subtitle && (
                  <p className="text-xs text-gray-600 line-clamp-1">{item.subtitle}</p>
                )}
                <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(item.date), { addSuffix: true })}
                </div>
              </div>
            </div>
          );

          if (item.href) {
            return (
              <Link key={item.id} href={item.href} className="block">
                {content}
              </Link>
            );
          }

          return <div key={item.id}>{content}</div>;
        })}
      </CardContent>
    </Card>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  MessageSquare,
  ChevronDown,
  ArrowUpRight,
  ArrowDownLeft,
  Check,
  AlertCircle,
  Clock,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/format';
import type { SmsLog, SmsEventType } from '@/types/database';

interface SmsHistoryProps {
  jobId?: string;
  leadId?: string;
}

/** Get human-readable label for event type */
function getEventTypeLabel(eventType: SmsEventType | null): string {
  if (!eventType) return 'Message';
  const labels: Record<SmsEventType, string> = {
    booking_notification: 'Booking Alert',
    booking_confirmation: 'Confirmation',
    reminder: 'Reminder',
    emergency_alert: 'Emergency',
    sales_lead_alert: 'Sales Lead',
    abandoned_call: 'Missed Call',
    schedule_conflict: 'Conflict',
    operator_reply: 'Operator Reply',
    customer_reply: 'Customer Reply',
    system: 'System',
  };
  return labels[eventType] || eventType;
}

/** Get delivery status badge */
function DeliveryStatusBadge({ status }: { status: string | null }) {
  if (!status) return null;

  const statusConfig: Record<string, { icon: React.ElementType; className: string; label: string }> = {
    delivered: {
      icon: Check,
      className: 'text-green-600 bg-green-50',
      label: 'Delivered',
    },
    sent: {
      icon: Check,
      className: 'text-blue-600 bg-blue-50',
      label: 'Sent',
    },
    queued: {
      icon: Clock,
      className: 'text-gray-600 bg-gray-100',
      label: 'Queued',
    },
    failed: {
      icon: AlertCircle,
      className: 'text-red-600 bg-red-50',
      label: 'Failed',
    },
    undelivered: {
      icon: AlertCircle,
      className: 'text-amber-600 bg-amber-50',
      label: 'Undelivered',
    },
  };

  const config = statusConfig[status.toLowerCase()] || {
    icon: Clock,
    className: 'text-gray-600 bg-gray-100',
    label: status,
  };
  const Icon = config.icon;

  return (
    <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium', config.className)}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

export function SmsHistory({ jobId, leadId }: SmsHistoryProps) {
  const [messages, setMessages] = useState<SmsLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    async function fetchMessages() {
      if (!jobId && !leadId) {
        setLoading(false);
        return;
      }

      try {
        const params = new URLSearchParams();
        if (jobId) params.set('job_id', jobId);
        if (leadId) params.set('lead_id', leadId);

        const response = await fetch(`/api/sms-log?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch SMS history');
        }

        const data = await response.json();
        setMessages(data.messages || []);
      } catch (err) {
        console.error('Error fetching SMS history:', err);
        setError('Unable to load SMS history');
      } finally {
        setLoading(false);
      }
    }

    fetchMessages();
  }, [jobId, leadId]);

  // Don't render if no messages and not loading
  if (!loading && messages.length === 0) {
    return null;
  }

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 cursor-pointer hover:bg-gray-50 transition-colors">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                SMS Activity
                {messages.length > 0 && (
                  <span className="text-xs font-normal text-gray-500">
                    ({messages.length})
                  </span>
                )}
              </span>
              <ChevronDown
                className={cn(
                  'w-4 h-4 transition-transform duration-200',
                  isOpen && 'rotate-180'
                )}
              />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : error ? (
              <p className="text-sm text-red-500">{error}</p>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'rounded-lg p-3 text-sm',
                      msg.direction === 'outbound'
                        ? 'bg-blue-50 border-l-2 border-blue-400'
                        : 'bg-gray-50 border-l-2 border-gray-400'
                    )}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {msg.direction === 'outbound' ? (
                          <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />
                        ) : (
                          <ArrowDownLeft className="w-3.5 h-3.5 text-gray-600" />
                        )}
                        <span className="font-medium text-gray-900">
                          {msg.direction === 'outbound' ? 'Sent' : 'Received'}
                        </span>
                        {msg.event_type && (
                          <span className="text-xs text-gray-500">
                            {getEventTypeLabel(msg.event_type)}
                          </span>
                        )}
                      </div>
                      <DeliveryStatusBadge status={msg.delivery_status} />
                    </div>
                    {/* Message Body */}
                    <p className="text-gray-700 whitespace-pre-wrap">{msg.body}</p>
                    {/* Timestamp */}
                    <p className="text-xs text-gray-400 mt-1">
                      {formatRelativeTime(msg.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

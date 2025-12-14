'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { RevenueTierBadge } from '@/components/ui/revenue-tier-badge';
import { Phone, PhoneIncoming, PhoneOutgoing, Clock } from 'lucide-react';
import { formatPhone } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/format';
import { getOrderedSignals, isCriticalSignal } from '@/lib/revenue-signals';
import { CriticalSignalBadge, SignalBadge } from '@/components/ui/critical-signal-badge';
import type { Call, RevenueTier, RevenueTierLabel } from '@/types/database';

interface CallCardProps {
  call: Call;
  timezone: string;
  onClick?: () => void;
}

/** Format call duration for display */
function formatDuration(seconds: number | null): string {
  if (!seconds) return '--';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

/** Get outcome badge color and label */
function getOutcomeDisplay(outcome: string | null): { label: string; color: string } {
  const outcomes: Record<string, { label: string; color: string }> = {
    completed: { label: 'Booked', color: 'bg-green-100 text-green-700' },
    callback_later: { label: 'Callback', color: 'bg-blue-100 text-blue-700' },
    sales_lead: { label: 'Sales Lead', color: 'bg-purple-100 text-purple-700' },
    customer_hangup: { label: 'Hung Up', color: 'bg-red-100 text-red-700' },
    wrong_number: { label: 'Wrong #', color: 'bg-gray-100 text-gray-600' },
    out_of_area: { label: 'Out of Area', color: 'bg-amber-100 text-amber-700' },
    safety_emergency: { label: 'Emergency', color: 'bg-red-100 text-red-700' },
    urgent_escalation: { label: 'Urgent', color: 'bg-orange-100 text-orange-700' },
    waitlist_added: { label: 'Waitlist', color: 'bg-purple-100 text-purple-600' },
    cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600' },
    rescheduled: { label: 'Rescheduled', color: 'bg-blue-100 text-blue-700' },
  };
  return outcomes[outcome || ''] || { label: outcome || 'Unknown', color: 'bg-gray-100 text-gray-600' };
}

/** Get first initial for avatar */
function getInitial(name: string | null): string {
  if (!name) return '?';
  return name.trim().charAt(0).toUpperCase();
}

export const CallCard = React.forwardRef<HTMLDivElement, CallCardProps>(
  ({ call, timezone, onClick }, ref) => {
    const outcomeDisplay = getOutcomeDisplay(call.outcome);
    const DirectionIcon = call.direction === 'inbound' ? PhoneIncoming : PhoneOutgoing;

    return (
      <Card
        ref={ref}
        className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
        onClick={onClick}
      >
        <CardContent className="p-4">
          {/* Header: Outcome Badge + Duration */}
          <div className="flex items-start justify-between mb-1">
            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${outcomeDisplay.color}`}>
              {outcomeDisplay.label}
            </span>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatDuration(call.duration_seconds)}</span>
            </div>
          </div>

          {/* Phone + Direction + Time */}
          <div className="flex items-center gap-2 mb-3">
            <DirectionIcon className={`w-4 h-4 ${call.direction === 'inbound' ? 'text-green-600' : 'text-blue-600'}`} />
            <span className="font-medium text-gray-900">{formatPhone(call.phone_number)}</span>
            <span className="text-sm text-gray-400">
              {formatRelativeTime(call.started_at)}
            </span>
          </div>

          {/* Customer Row: Avatar + Name + Revenue Tier */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Initial Avatar */}
              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                {getInitial(call.customer_name)}
              </div>
              <span className="text-sm text-gray-700">
                {call.customer_name || 'Unknown Caller'}
              </span>
            </div>

            {/* Revenue Tier Badge */}
            {call.revenue_tier_label && (
              <RevenueTierBadge
                tier={call.revenue_tier_label.replace(/\$/g, '').length === 4 ? 'replacement' :
                      call.revenue_tier_label.replace(/\$/g, '').length === 3 ? 'major_repair' :
                      call.revenue_tier_label === '$$' ? 'standard_repair' :
                      call.revenue_tier_label === '$' ? 'minor' : 'diagnostic' as RevenueTier}
                label={call.revenue_tier_label as RevenueTierLabel}
                signals={call.revenue_tier_signals}
                showTooltip
              />
            )}
          </div>

          {/* Inline Revenue Signals (visible without hover) - critical first */}
          {call.revenue_tier_signals && call.revenue_tier_signals.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {getOrderedSignals(call.revenue_tier_signals).slice(0, 2).map((signal, i) =>
                isCriticalSignal(signal) ? (
                  <CriticalSignalBadge key={i} signal={signal} />
                ) : (
                  <SignalBadge key={i} signal={signal} />
                )
              )}
              {call.revenue_tier_signals.length > 2 && (
                <span className="text-xs text-gray-400">
                  +{call.revenue_tier_signals.length - 2} more
                </span>
              )}
            </div>
          )}

          {/* HVAC Issue Type if available */}
          {call.hvac_issue_type && (
            <div className="mt-2 text-xs text-gray-500">
              {call.hvac_issue_type}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);

CallCard.displayName = 'CallCard';

'use client';

import { cn } from '@/lib/utils';
import type { EndCallReason, LeadStatus } from '@/types/database';

interface EndCallReasonBadgeProps {
  reason: EndCallReason | null;
  status: LeadStatus;
  size?: 'sm' | 'md';
}

// Map end_call_reason to human-readable labels and context
const END_CALL_REASON_CONFIG: Record<string, {
  label: string;
  icon: string;
  description: string;
  className: string;
}> = {
  out_of_area: {
    label: 'Out of Area',
    icon: '📍',
    description: 'Customer location outside service area',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  customer_hangup: {
    label: 'Customer Hung Up',
    icon: '📞',
    description: 'Call ended before booking',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
  callback_later: {
    label: 'Callback Requested',
    icon: '🔔',
    description: 'Customer asked for a callback',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  sales_lead: {
    label: 'Sales Opportunity',
    icon: '💰',
    description: 'Replacement or new equipment inquiry',
    className: 'bg-green-50 text-green-700 border-green-200',
  },
  waitlist_added: {
    label: 'On Waitlist',
    icon: '⏳',
    description: 'Added to availability waitlist',
    className: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  safety_emergency: {
    label: 'Safety Emergency',
    icon: '🚨',
    description: 'Advised to call 911',
    className: 'bg-red-100 text-red-800 border-red-300',
  },
  urgent_escalation: {
    label: 'Urgent Escalation',
    icon: '⚡',
    description: 'Tier 2 urgent situation',
    className: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  wrong_number: {
    label: 'Wrong Number',
    icon: '❌',
    description: 'Caller reached wrong business',
    className: 'bg-gray-50 text-gray-600 border-gray-200',
  },
  completed: {
    label: 'Completed',
    icon: '✅',
    description: 'Call completed successfully',
    className: 'bg-green-50 text-green-700 border-green-200',
  },
  cancelled: {
    label: 'Cancelled',
    icon: '🚫',
    description: 'Appointment was cancelled',
    className: 'bg-gray-50 text-gray-600 border-gray-200',
  },
  rescheduled: {
    label: 'Rescheduled',
    icon: '📅',
    description: 'Appointment was rescheduled',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
};

// Mappings where the end_call_reason is redundant with the status
const REDUNDANT_MAPPINGS: Record<string, LeadStatus[]> = {
  callback_later: ['callback_requested'],
  sales_lead: ['sales_opportunity'],
  waitlist_added: ['deferred'],
  customer_hangup: ['abandoned'],
};

export function EndCallReasonBadge({ reason, status, size = 'sm' }: EndCallReasonBadgeProps) {
  if (!reason) return null;

  const config = END_CALL_REASON_CONFIG[reason];
  if (!config) return null;

  // Only show if the reason adds context beyond the status
  // (e.g., show "Out of Area" for "lost" status, but don't show "Callback Requested" for "callback_requested" status)
  if (REDUNDANT_MAPPINGS[reason]?.includes(status)) {
    return null; // Don't show badge if it's redundant with the status
  }

  const sizeClasses = size === 'sm'
    ? 'text-xs px-1.5 py-0.5'
    : 'text-sm px-2 py-1';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border font-medium',
        config.className,
        sizeClasses
      )}
      title={config.description}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}

export function getEndCallReasonInfo(reason: EndCallReason | null) {
  if (!reason) return null;
  return END_CALL_REASON_CONFIG[reason] || null;
}

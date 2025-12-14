'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { RevenueTierBadge } from '@/components/ui/revenue-tier-badge';
import { MoreHorizontal } from 'lucide-react';
import { getOrderedSignals, isCriticalSignal } from '@/lib/revenue-signals';
import { CriticalSignalBadge, SignalBadge } from '@/components/ui/critical-signal-badge';
import type { Job } from '@/types/database';

interface JobCardProps {
  job: Job;
  timezone: string;
  onMenuClick?: (e: React.MouseEvent) => void;
}

/** Format service type for display as headline */
function formatServiceType(type: string): string {
  const labels: Record<string, string> = {
    hvac: 'HVAC Services',
    plumbing: 'Plumbing Services',
    electrical: 'Electrical Services',
    general: 'General Services',
  };
  return labels[type] || type.charAt(0).toUpperCase() + type.slice(1) + ' Services';
}

/** Get first initial for avatar */
function getInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase();
}

/** Get street address (first part before comma) */
function getStreetAddress(address: string | null): string {
  if (!address) return 'Address pending';
  const parts = address.split(',');
  return parts[0].trim();
}

export const JobCard = React.forwardRef<HTMLDivElement, JobCardProps>(
  ({ job, onMenuClick }, ref) => {
    return (
      <Card
        ref={ref}
        className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
      >
        <CardContent className="p-4">
          {/* Header: Service Type + Menu */}
          <div className="flex items-start justify-between mb-1">
            <h3 className="font-semibold text-gray-900">
              {formatServiceType(job.service_type)}
            </h3>
            {onMenuClick && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMenuClick(e);
                }}
                className="p-1 -mr-1 -mt-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Address */}
          <p className="text-sm text-gray-500 mb-3">
            {getStreetAddress(job.customer_address)}
          </p>

          {/* Customer Row: Avatar + Name + Value */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Initial Avatar */}
              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                {getInitial(job.customer_name)}
              </div>
              <span className="text-sm text-gray-700">{job.customer_name}</span>
            </div>

            {/* Revenue Tier Badge or Estimated Value */}
            {job.revenue_tier_label ? (
              <RevenueTierBadge
                tier={job.revenue_tier}
                label={job.revenue_tier_label}
                signals={job.revenue_tier_signals}
                showTooltip
              />
            ) : job.estimated_value ? (
              <span className="text-sm font-medium text-gray-900">
                ${job.estimated_value.toLocaleString()}
              </span>
            ) : null}
          </div>

          {/* Inline Revenue Signals (visible without hover) - critical first */}
          {job.revenue_tier_signals && job.revenue_tier_signals.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {getOrderedSignals(job.revenue_tier_signals).slice(0, 2).map((signal, i) =>
                isCriticalSignal(signal) ? (
                  <CriticalSignalBadge key={i} signal={signal} />
                ) : (
                  <SignalBadge key={i} signal={signal} />
                )
              )}
              {job.revenue_tier_signals.length > 2 && (
                <span className="text-xs text-gray-400">
                  +{job.revenue_tier_signals.length - 2} more
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);

JobCard.displayName = 'JobCard';

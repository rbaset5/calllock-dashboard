'use client';

import { Lead } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { RevenueTierBadge } from '@/components/ui/revenue-tier-badge';
import { MoreHorizontal, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeadCardProps {
  lead: Lead;
  onMenuClick?: (e: React.MouseEvent) => void;
  onClick?: () => void;
}

/** Format service type for display as headline */
function formatServiceType(type: string | null): string {
  if (!type) return 'Service Request';
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

/** Get priority border color */
function getPriorityBorder(priority: Lead['priority']): string {
  switch (priority) {
    case 'hot':
      return 'border-l-4 border-l-red-500';
    case 'warm':
      return 'border-l-4 border-l-orange-400';
    case 'cold':
      return 'border-l-4 border-l-gray-300';
    default:
      return '';
  }
}

export function LeadCard({ lead, onMenuClick, onClick }: LeadCardProps) {
  const priorityClass = getPriorityBorder(lead.priority);

  return (
    <Card
      className={cn(
        'overflow-hidden cursor-pointer hover:shadow-md transition-shadow',
        priorityClass
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Header: Service Type + Call Indicator + Menu */}
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-gray-900">
              {formatServiceType(lead.service_type)}
            </h3>
            {lead.original_call_id && (
              <span title="From voice call">
                <Phone className="w-3.5 h-3.5 text-blue-500" />
              </span>
            )}
          </div>
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
          {getStreetAddress(lead.customer_address)}
        </p>

        {/* Customer Row: Avatar + Name + Value */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Initial Avatar */}
            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
              {getInitial(lead.customer_name)}
            </div>
            <span className="text-sm text-gray-700">{lead.customer_name}</span>
          </div>

          {/* Revenue Tier Badge or Estimated Value */}
          {lead.revenue_tier_label ? (
            <RevenueTierBadge
              tier={lead.revenue_tier}
              label={lead.revenue_tier_label}
              signals={lead.revenue_tier_signals}
              showTooltip
            />
          ) : lead.estimated_value ? (
            <span className="text-sm font-medium text-gray-900">
              ${lead.estimated_value.toLocaleString()}
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

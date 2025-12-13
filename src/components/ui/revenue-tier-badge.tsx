'use client';

import { cn } from '@/lib/utils';
import type { RevenueTier, RevenueTierLabel } from '@/types/database';

interface RevenueTierBadgeProps {
  tier: RevenueTier | null;
  label: RevenueTierLabel | null;
  signals?: string[] | null;
  showTooltip?: boolean;
  size?: 'sm' | 'md';
}

/** Get tier color classes */
function getTierColor(tier: RevenueTier | null): string {
  switch (tier) {
    case 'replacement':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'major_repair':
      return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'standard_repair':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'minor':
      return 'bg-green-100 text-green-700 border-green-200';
    case 'diagnostic':
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

/** Get tier description */
function getTierDescription(tier: RevenueTier | null): string {
  switch (tier) {
    case 'replacement':
      return 'Potential Replacement';
    case 'major_repair':
      return 'Major Repair';
    case 'standard_repair':
      return 'Standard Repair';
    case 'minor':
      return 'Maintenance';
    case 'diagnostic':
    default:
      return 'Diagnostic';
  }
}

export function RevenueTierBadge({
  tier,
  label,
  signals,
  showTooltip = false,
  size = 'sm',
}: RevenueTierBadgeProps) {
  if (!tier && !label) return null;

  const displayLabel = label || '$$?';
  const colorClasses = getTierColor(tier);
  const description = getTierDescription(tier);

  const sizeClasses = size === 'sm'
    ? 'px-1.5 py-0.5 text-xs'
    : 'px-2 py-1 text-sm';

  if (showTooltip && signals && signals.length > 0) {
    return (
      <div className="relative group">
        <span
          className={cn(
            'inline-flex items-center font-semibold rounded border',
            colorClasses,
            sizeClasses
          )}
        >
          {displayLabel}
        </span>
        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
          <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
            <div className="font-medium mb-1">{description}</div>
            <ul className="space-y-0.5">
              {signals.map((signal, i) => (
                <li key={i} className="text-gray-300">• {signal}</li>
              ))}
            </ul>
            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold rounded border',
        colorClasses,
        sizeClasses
      )}
      title={description}
    >
      {displayLabel}
    </span>
  );
}

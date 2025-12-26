'use client';

import { formatRelativeTime } from '@/lib/format';
import { getEquipmentIcon, formatEquipmentType, formatEquipmentAge } from '@/lib/equipment-utils';
import { RevenueTierBadge, ConfidenceIndicator, getRevenueTierInfo } from '@/components/ui/badge';
import { QuickScanBar, DecisionMakerDetail } from '@/components/ui/quick-scan-bar';
import { cn } from '@/lib/utils';
import type {
  PropertyType,
  SystemStatus,
  EquipmentAgeBracket,
} from '@/types/database';

type UrgencyLevel = 'low' | 'medium' | 'high' | 'emergency';
type PriorityColor = 'red' | 'green' | 'blue' | 'gray';
type ServiceType = 'hvac' | 'plumbing' | 'electrical' | 'general';

interface DetailHeroProps {
  customerName: string;
  urgency?: UrgencyLevel | string | null;
  priorityColor?: PriorityColor | string | null;
  equipmentType?: string | null;
  equipmentAge?: string | null;
  revenueTier?: string | null;
  revenueConfidence?: string | null;
  serviceType?: ServiceType | string | null;
  createdAt: string;
  className?: string;
  // HVAC Must-Have Fields
  propertyType?: PropertyType | null;
  systemStatus?: SystemStatus | null;
  equipmentAgeBracket?: EquipmentAgeBracket | null;
  isDecisionMaker?: boolean | null;
  decisionMakerContact?: string | null;
}

/**
 * Hero section for lead/job detail views
 * Designed for 2-second scannability by HVAC operators
 */
export function DetailHero({
  customerName,
  urgency,
  priorityColor,
  equipmentType,
  equipmentAge,
  revenueTier,
  revenueConfidence,
  serviceType,
  createdAt,
  className,
  // HVAC Must-Have Fields
  propertyType,
  systemStatus,
  equipmentAgeBracket,
  isDecisionMaker,
  decisionMakerContact,
}: DetailHeroProps) {
  const EquipmentIcon = getEquipmentIcon(equipmentType);
  const formattedAge = formatEquipmentAge(equipmentAge);
  const formattedType = formatEquipmentType(equipmentType);
  const tierInfo = getRevenueTierInfo(revenueTier);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Customer Name + Time */}
      <div className="flex items-start justify-between gap-2">
        <h1 className="text-2xl font-bold text-gray-900 leading-tight">
          {customerName}
        </h1>
        <span className="text-sm text-gray-500 whitespace-nowrap">
          {formatRelativeTime(createdAt)}
        </span>
      </div>

      {/* Quick-Scan Bar (HVAC Must-Have Info) */}
      {(propertyType || systemStatus || equipmentAgeBracket) && (
        <QuickScanBar
          propertyType={propertyType}
          systemStatus={systemStatus}
          equipmentAgeBracket={equipmentAgeBracket}
          isDecisionMaker={isDecisionMaker}
          decisionMakerContact={decisionMakerContact}
        />
      )}

      {/* Key Info Row: Urgency + Equipment + Revenue */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Urgency Pill */}
        {urgency && (
          <UrgencyPill urgency={urgency} />
        )}

        {/* Priority Color Badge (only for red/green) */}
        {priorityColor && (priorityColor === 'red' || priorityColor === 'green') && (
          <PriorityBadge color={priorityColor} />
        )}

        {/* Equipment Info */}
        {(formattedType || serviceType) && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-full text-sm text-gray-700">
            <EquipmentIcon className="w-4 h-4 text-gray-500" />
            <span className="font-medium">
              {formattedType || (serviceType === 'hvac' ? 'HVAC' : serviceType)}
            </span>
            {formattedAge && (
              <span className="text-gray-500">• {formattedAge}</span>
            )}
          </div>
        )}
      </div>

      {/* Decision Maker Warning (detailed view) */}
      {isDecisionMaker === false && (
        <DecisionMakerDetail
          isDecisionMaker={isDecisionMaker}
          contact={decisionMakerContact}
        />
      )}

      {/* Revenue Tier - Prominent Display */}
      {revenueTier && (
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
          <RevenueTierBadgeLarge tier={revenueTier} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">
                {tierInfo.label}
              </span>
              {revenueConfidence && (
                <ConfidenceIndicator confidence={revenueConfidence} />
              )}
            </div>
            <span className="text-sm text-gray-500">
              Est. {tierInfo.range}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Large urgency pill with color-coded background
 */
function UrgencyPill({ urgency }: { urgency: string }) {
  const config: Record<string, { label: string; className: string }> = {
    emergency: { label: 'EMERGENCY', className: 'bg-red-600 text-white' },
    high: { label: 'HIGH URGENCY', className: 'bg-amber-500 text-white' },
    medium: { label: 'MEDIUM', className: 'bg-blue-500 text-white' },
    low: { label: 'LOW', className: 'bg-green-500 text-white' },
  };

  const { label, className } = config[urgency] || { label: urgency.toUpperCase(), className: 'bg-gray-500 text-white' };

  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold tracking-wide',
      className
    )}>
      {label}
    </span>
  );
}

/**
 * Priority color badge for red (callback risk) and green (commercial)
 */
function PriorityBadge({ color }: { color: string }) {
  const config: Record<string, { label: string; className: string }> = {
    red: { label: 'CALLBACK RISK', className: 'bg-red-100 text-red-700 border border-red-200' },
    green: { label: 'COMMERCIAL $$$', className: 'bg-amber-100 text-amber-700 border border-amber-200' },
  };

  const { label, className } = config[color] || { label: '', className: '' };
  if (!label) return null;

  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold',
      className
    )}>
      {label}
    </span>
  );
}

/**
 * Large revenue tier badge for hero section
 */
function RevenueTierBadgeLarge({ tier }: { tier: string }) {
  const config: Record<string, { className: string }> = {
    '$$$$': { className: 'bg-red-100 text-red-700 border-red-200' },
    '$$$': { className: 'bg-amber-100 text-amber-700 border-amber-200' },
    '$$': { className: 'bg-blue-100 text-blue-700 border-blue-200' },
    '$': { className: 'bg-green-100 text-green-700 border-green-200' },
    '$$?': { className: 'bg-gray-100 text-gray-600 border-gray-200' },
  };

  const { className } = config[tier] || config['$$?'];

  return (
    <span className={cn(
      'inline-flex items-center justify-center w-12 h-12 rounded-lg border text-lg font-bold',
      className
    )}>
      {tier}
    </span>
  );
}

export default DetailHero;

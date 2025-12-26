'use client';

import React from 'react';
import {
  Home,
  Building2,
  ZapOff,
  Zap,
  Activity,
  Wrench,
  UserCheck,
  UserX,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  PropertyType,
  SystemStatus,
  EquipmentAgeBracket,
} from '@/types/database';

// ============================================================
// QUICK-SCAN BAR COMPONENT
// ============================================================
// Displays HVAC owner-operator must-have info at a glance:
// - Property Type (house/condo/commercial)
// - System Status (dead/partial/running)
// - Equipment Age Bracket (<10/10-15/15+)
// - Decision Maker Status (homeowner/tenant/manager)

interface QuickScanBarProps {
  propertyType?: PropertyType | null;
  systemStatus?: SystemStatus | null;
  equipmentAgeBracket?: EquipmentAgeBracket | null;
  isDecisionMaker?: boolean | null;
  decisionMakerContact?: string | null;
  className?: string;
  compact?: boolean; // For smaller card contexts
}

// ============================================================
// PROPERTY TYPE BADGE
// ============================================================

const propertyTypeConfig: Record<string, {
  label: string;
  icon: typeof Home;
  className: string;
}> = {
  house: {
    label: 'House',
    icon: Home,
    className: 'bg-gray-100 text-gray-700',
  },
  condo: {
    label: 'Condo',
    icon: Building2,
    className: 'bg-gray-100 text-gray-700',
  },
  apartment: {
    label: 'Apt',
    icon: Building2,
    className: 'bg-gray-100 text-gray-700',
  },
  commercial: {
    label: 'Commercial',
    icon: Building2,
    className: 'bg-green-100 text-green-700 border border-green-200',
  },
};

function PropertyTypeBadge({ type, compact }: { type: PropertyType; compact?: boolean }) {
  const config = propertyTypeConfig[type];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs',
        config.className
      )}
    >
      <Icon className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{config.label}</span>
    </span>
  );
}

// ============================================================
// SYSTEM STATUS BADGE
// ============================================================

const systemStatusConfig: Record<string, {
  label: string;
  icon: typeof Zap;
  className: string;
}> = {
  completely_down: {
    label: 'DEAD',
    icon: ZapOff,
    className: 'bg-red-100 text-red-700',
  },
  partially_working: {
    label: 'PARTIAL',
    icon: Zap,
    className: 'bg-amber-100 text-amber-700',
  },
  running_but_ineffective: {
    label: 'RUNNING',
    icon: Activity,
    className: 'bg-blue-100 text-blue-700',
  },
};

function SystemStatusBadge({ status, compact }: { status: SystemStatus; compact?: boolean }) {
  const config = systemStatusConfig[status];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-semibold',
        compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs',
        config.className
      )}
    >
      <Icon className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{config.label}</span>
    </span>
  );
}

// ============================================================
// EQUIPMENT AGE BRACKET BADGE
// ============================================================

const ageBracketConfig: Record<string, {
  label: string;
  className: string;
}> = {
  under_10: {
    label: '< 10',
    className: 'bg-green-100 text-green-700',
  },
  '10_to_15': {
    label: '10-15',
    className: 'bg-amber-100 text-amber-700',
  },
  over_15: {
    label: '15+',
    className: 'bg-red-100 text-red-700',
  },
  unknown: {
    label: '?',
    className: 'bg-gray-100 text-gray-500',
  },
};

function AgeBracketBadge({ bracket, compact }: { bracket: EquipmentAgeBracket; compact?: boolean }) {
  const config = ageBracketConfig[bracket];
  if (!config) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs',
        config.className
      )}
    >
      <Wrench className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{config.label}</span>
    </span>
  );
}

// ============================================================
// DECISION MAKER BADGE
// ============================================================

function DecisionMakerBadge({
  isDecisionMaker,
  contact,
  compact,
}: {
  isDecisionMaker?: boolean | null;
  contact?: string | null;
  compact?: boolean;
}) {
  // If not explicitly set, don't show
  if (isDecisionMaker === null || isDecisionMaker === undefined) return null;

  if (isDecisionMaker) {
    // Homeowner - show subtle check (or nothing in compact mode)
    if (compact) return null;
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full font-medium',
          'px-2 py-1 text-xs bg-green-50 text-green-700'
        )}
        title="Caller is authorized to approve work"
      >
        <UserCheck className="w-3.5 h-3.5" />
        <span>Owner</span>
      </span>
    );
  }

  // Not decision maker - show warning badge
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-semibold',
        compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs',
        'bg-red-100 text-red-700 border border-red-200'
      )}
      title={contact ? `Contact: ${contact}` : 'Caller cannot authorize work'}
    >
      <UserX className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{compact ? 'AUTH' : 'Not Auth'}</span>
    </span>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function QuickScanBar({
  propertyType,
  systemStatus,
  equipmentAgeBracket,
  isDecisionMaker,
  decisionMakerContact,
  className,
  compact = false,
}: QuickScanBarProps) {
  // Don't render if no data
  const hasData = propertyType || systemStatus || equipmentAgeBracket || isDecisionMaker !== null;
  if (!hasData) return null;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center',
        compact ? 'gap-1' : 'gap-1.5',
        className
      )}
    >
      {propertyType && <PropertyTypeBadge type={propertyType} compact={compact} />}
      {systemStatus && <SystemStatusBadge status={systemStatus} compact={compact} />}
      {equipmentAgeBracket && <AgeBracketBadge bracket={equipmentAgeBracket} compact={compact} />}
      <DecisionMakerBadge
        isDecisionMaker={isDecisionMaker}
        contact={decisionMakerContact}
        compact={compact}
      />
    </div>
  );
}

// ============================================================
// DECISION MAKER DETAIL (for expanded/detail views)
// ============================================================

export function DecisionMakerDetail({
  isDecisionMaker,
  contact,
}: {
  isDecisionMaker?: boolean | null;
  contact?: string | null;
}) {
  if (isDecisionMaker === null || isDecisionMaker === undefined) return null;

  if (isDecisionMaker) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-700">
        <UserCheck className="w-4 h-4" />
        <span>Homeowner - authorized to approve work</span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
      <UserX className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold text-red-700 block">
          Not Authorized
        </span>
        {contact && (
          <span className="text-sm text-red-600">
            Contact: {contact}
          </span>
        )}
        {!contact && (
          <span className="text-sm text-red-600">
            Caller cannot authorize repairs - get owner contact
          </span>
        )}
      </div>
    </div>
  );
}

export default QuickScanBar;

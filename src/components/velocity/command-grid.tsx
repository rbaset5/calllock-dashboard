'use client';

/**
 * Command Grid Component
 *
 * 2-column expanded section layout for velocity cards.
 * Archetype-specific column configurations:
 * - HAZARD: Equipment | Risk Factors
 * - RECOVERY: Callback Context | Risk Level
 * - REVENUE: Equipment Profile | Revenue Signals
 * - LOGISTICS: Work Request | Logistics
 */

import {
  Wrench,
  AlertTriangle,
  Phone,
  DollarSign,
  Key,
  Home,
  Clock,
  Heart,
  TrendingUp,
  Calendar,
  Info,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Lead, Job, VelocityArchetype } from '@/types/database';
import { extractSignals, isEquipmentOld, getRefrigerantStatus, getHazardLabel } from '@/lib/extract-signals';
import { formatDollarEstimate } from '@/lib/velocity';
import { differenceInDays, format } from 'date-fns';

// ============================================================================
// TYPES
// ============================================================================

interface GridItem {
  label: string;
  value: string | number | null;
  highlight?: 'danger' | 'warning' | 'success' | 'muted';
  bold?: boolean;
  icon?: React.ElementType; // Lucide icon component for special rendering
}

interface GridColumn {
  title: string;
  icon: React.ElementType;
  items: GridItem[];
}

type VelocityItem = Lead | Job;

// ============================================================================
// HELPERS
// ============================================================================

function isLead(item: VelocityItem): item is Lead {
  return 'issue_description' in item;
}

function formatValue(item: GridItem): string {
  if (item.value === null || item.value === undefined) {
    return '—';
  }
  return String(item.value);
}

function getTranscriptText(item: VelocityItem): string {
  return item.ai_summary || (item as Lead).call_transcript || '';
}

// ============================================================================
// COLUMN BUILDERS (2-COLUMN)
// ============================================================================

function buildHazardColumns(item: VelocityItem): GridColumn[] {
  const text = getTranscriptText(item);
  const signals = extractSignals(text);
  const lead = item as Lead;

  // EQUIPMENT COLUMN
  const equipmentItems: GridItem[] = [
    {
      label: 'Location',
      value: signals.unitLocation || lead.property_type || 'Unknown',
    },
    {
      label: 'Fuel Type',
      value: signals.hazardType === 'gas' ? 'Gas'
        : signals.hazardType === 'electrical' ? 'Electric'
          : signals.hazardType === 'water' ? 'Water'
            : 'Unknown',
    },
    {
      label: 'Shut-off',
      value: signals.shutOffInfo || 'Verify on-site',
      highlight: signals.shutOffInfo ? 'success' : 'warning',
    },
  ];

  // RISK FACTORS COLUMN
  const riskItems: GridItem[] = [];

  if (signals.evacuationNeeded) {
    riskItems.push({
      label: 'Recommendation',
      value: 'Evacuate immediately',
      highlight: 'danger',
      bold: true,
      icon: AlertTriangle,
    });
  }

  if (signals.occupants.length > 0) {
    riskItems.push({
      label: 'Occupants',
      value: signals.occupants.join(', '),
      highlight: 'warning',
      icon: Home,
    });
  }

  if (signals.urgencyKeywords.length > 0) {
    riskItems.push({
      label: 'Detected',
      value: `"${signals.urgencyKeywords[0]}"`,
    });
  }

  if (signals.hazardType) {
    riskItems.push({
      label: 'Hazard Type',
      value: getHazardLabel(signals.hazardType),
      highlight: 'danger',
    });
  }

  if (riskItems.length === 0 && lead.ai_summary) {
    riskItems.push({
      label: 'AI Note',
      value: lead.ai_summary.slice(0, 50) + '...',
    });
  }

  return [
    { title: 'Equipment', icon: Wrench, items: equipmentItems },
    { title: 'Risk Factors', icon: AlertTriangle, items: riskItems },
  ];
}

function buildRecoveryColumns(item: VelocityItem): GridColumn[] {
  const text = getTranscriptText(item);
  const signals = extractSignals(text);
  const lead = item as Lead;

  const daysSinceCreated = differenceInDays(new Date(), new Date(item.created_at));

  // CALLBACK CONTEXT COLUMN
  const contextItems: GridItem[] = [
    {
      label: 'Original Service',
      value: lead.issue_description || lead.priority_reason || 'Unknown',
    },
    {
      label: 'Original Tech',
      value: 'Unknown',
    },
    {
      label: 'Warranty',
      value: /warranty/i.test(text) ? 'May apply' : 'Check status',
      highlight: /warranty/i.test(text) ? 'warning' : undefined,
    },
  ];

  // RISK LEVEL COLUMN
  const riskItems: GridItem[] = [];

  const sentimentScore = lead.sentiment_score;
  if (sentimentScore !== null && sentimentScore !== undefined) {
    riskItems.push({
      label: 'Sentiment',
      value: `${sentimentScore}/5`,
      highlight: sentimentScore <= 2 ? 'danger' : sentimentScore === 3 ? 'warning' : 'success',
      bold: sentimentScore <= 2,
      icon: Heart,
    });
  }

  if (signals.customerQuotes.length > 0) {
    riskItems.push({
      label: 'Quote',
      value: `"${signals.customerQuotes[0].slice(0, 40)}..."`,
    });
  }

  if (signals.sentimentKeywords.length > 0) {
    riskItems.push({
      label: 'Mood',
      value: signals.sentimentKeywords[0],
      highlight: ['angry', 'frustrated', 'furious'].includes(signals.sentimentKeywords[0]) ? 'danger' : 'warning',
    });
  }

  riskItems.push({
    label: 'Callback #',
    value: '1st',
  });

  if (riskItems.length === 0) {
    riskItems.push({
      label: 'Risk',
      value: lead.priority_reason || 'Assess on call',
    });
  }

  return [
    { title: 'Callback Context', icon: Phone, items: contextItems },
    { title: 'Risk Level', icon: AlertCircle, items: riskItems },
  ];
}

function buildRevenueColumns(item: VelocityItem): GridColumn[] {
  const text = getTranscriptText(item);
  const signals = extractSignals(text);
  const lead = item as Lead;

  const age = signals.equipmentAge || (lead.equipment_age ? parseInt(lead.equipment_age, 10) : null);
  const refrigerantStatus = getRefrigerantStatus(signals.refrigerantType);

  // EQUIPMENT PROFILE COLUMN
  const equipmentItems: GridItem[] = [
    {
      label: 'Make/Model',
      value: signals.equipmentMake || lead.equipment_type || lead.equipment_age_bracket || 'Unknown',
    },
    {
      label: 'Age',
      value: age ? `${age} years` : 'Unknown',
      highlight: isEquipmentOld(age) ? 'warning' : undefined,
      bold: isEquipmentOld(age),
    },
    {
      label: 'Refrigerant',
      value: signals.refrigerantType || 'Unknown',
      highlight: refrigerantStatus === 'obsolete' ? 'warning' : undefined,
    },
  ];

  // REVENUE SIGNALS COLUMN
  const revenueItems: GridItem[] = [];

  if (signals.financingMentioned) {
    revenueItems.push({
      label: 'Signal',
      value: 'Financing interest',
      highlight: 'success',
      icon: TrendingUp,
    });
  }

  if (signals.replacementMentioned) {
    revenueItems.push({
      label: 'Signal',
      value: 'Replacement ready',
      highlight: 'success',
      icon: CheckCircle2,
    });
  }

  if (lead.revenue_tier) {
    revenueItems.push({
      label: 'Tier',
      value: lead.revenue_tier.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      highlight: lead.revenue_tier === 'replacement' ? 'warning' : undefined,
    });
  }

  const dollarEstimate = formatDollarEstimate(item.estimated_value, item.revenue_tier);
  if (dollarEstimate.display) {
    revenueItems.push({
      label: 'Est. Value',
      value: dollarEstimate.display,
      highlight: 'success',
      icon: DollarSign,
    });
  }

  if (revenueItems.length === 0 && lead.ai_summary) {
    revenueItems.push({
      label: 'AI Note',
      value: lead.ai_summary.slice(0, 60) + (lead.ai_summary.length > 60 ? '...' : ''),
    });
  }

  return [
    { title: 'Equipment Profile', icon: Wrench, items: equipmentItems },
    { title: 'Revenue Signals', icon: DollarSign, items: revenueItems },
  ];
}

function buildLogisticsColumns(item: VelocityItem): GridColumn[] {
  const text = getTranscriptText(item);
  const signals = extractSignals(text);
  const lead = item as Lead;

  // WORK REQUEST COLUMN
  const workItems: GridItem[] = [
    {
      label: 'Service Type',
      value: lead.issue_description || lead.service_type || 'General',
    },
    {
      label: 'Duration Est.',
      value: lead.work_type === 'maintenance' ? '~1 hour'
        : lead.work_type === 'service' ? '~2 hours'
          : lead.work_type === 'install' ? '~4+ hours'
            : '~1-2 hours',
    },
    {
      label: 'Equipment',
      value: signals.equipmentMake || lead.equipment_type || 'Verify on-site',
    },
  ];

  // LOGISTICS COLUMN
  const logisticsItems: GridItem[] = [];

  if (signals.gateCode) {
    logisticsItems.push({
      label: 'Gate Code',
      value: signals.gateCode,
      highlight: 'success',
      icon: Key,
    });
  }

  if (signals.petWarning) {
    logisticsItems.push({
      label: 'Pet Warning',
      value: signals.petWarning,
      highlight: 'warning',
      icon: Info,
    });
  }

  if (signals.keyLocation) {
    logisticsItems.push({
      label: 'Key',
      value: signals.keyLocation,
    });
  }

  if (lead.time_preference) {
    logisticsItems.push({
      label: 'Time Pref',
      value: lead.time_preference,
      icon: Clock,
    });
  }

  if (logisticsItems.length === 0) {
    logisticsItems.push({
      label: 'Notes',
      value: lead.ai_summary ? lead.ai_summary.slice(0, 50) + '...' : 'No special notes',
    });
  }

  return [
    { title: 'Work Request', icon: Calendar, items: workItems },
    { title: 'Logistics', icon: Key, items: logisticsItems },
  ];
}

// ============================================================================
// COLUMN HEADER COLORS BY ARCHETYPE
// ============================================================================

function getColumnHeaderColors(archetype: VelocityArchetype): { bg: string; text: string } {
  switch (archetype) {
    case 'HAZARD':
      return { bg: 'bg-red-50', text: 'text-red-700' };
    case 'RECOVERY':
      return { bg: 'bg-slate-50', text: 'text-slate-700' };
    case 'REVENUE':
      return { bg: 'bg-amber-50', text: 'text-amber-700' };
    case 'LOGISTICS':
      return { bg: 'bg-blue-50', text: 'text-blue-700' };
    default:
      return { bg: 'bg-gray-50', text: 'text-gray-700' };
  }
}

function getBorderClass(archetype: VelocityArchetype): string {
  switch (archetype) {
    case 'HAZARD':
      return 'border-red-200';
    case 'RECOVERY':
      return 'border-slate-200';
    case 'REVENUE':
      return 'border-amber-200';
    case 'LOGISTICS':
      return 'border-blue-200';
    default:
      return 'border-gray-200';
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface CommandGridProps {
  data: VelocityItem;
  archetype: VelocityArchetype;
  className?: string;
}

export function CommandGrid({ data, archetype, className }: CommandGridProps) {
  let columns: GridColumn[];

  switch (archetype) {
    case 'HAZARD':
      columns = buildHazardColumns(data);
      break;
    case 'REVENUE':
      columns = buildRevenueColumns(data);
      break;
    case 'RECOVERY':
      columns = buildRecoveryColumns(data);
      break;
    case 'LOGISTICS':
    default:
      columns = buildLogisticsColumns(data);
      break;
  }

  const headerColors = getColumnHeaderColors(archetype);
  const borderClass = getBorderClass(archetype);

  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-3 p-4 rounded-xl min-h-[180px]',
        'bg-white',
        `border ${borderClass}`,
        'shadow-md',
        className
      )}
    >
      {columns.map((column) => (
        <div key={column.title} className="min-w-0">
          {/* Column Header */}
          <div
            className={cn(
              'flex items-center gap-1.5 mb-3 px-2.5 py-1.5 rounded-lg',
              headerColors.bg,
              headerColors.text
            )}
          >
            <column.icon className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="text-[11px] font-bold uppercase tracking-wider truncate">
              {column.title}
            </span>
          </div>

          {/* Column Items */}
          <div className="space-y-2 px-0.5">
            {column.items.map((item, idx) => (
              <div key={`${column.title}-${idx}`} className="text-xs">
                <span className="text-gray-500">
                  {item.label}:{' '}
                </span>
                {item.icon ? (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 font-medium',
                      item.bold && 'font-bold',
                      item.highlight === 'danger' && 'text-red-600 dark:text-red-400',
                      item.highlight === 'warning' && 'text-amber-600 dark:text-amber-400',
                      item.highlight === 'success' && 'text-emerald-600 dark:text-emerald-400',
                      item.highlight === 'muted' && 'text-gray-400 dark:text-gray-500',
                      !item.highlight && 'text-gray-900 dark:text-white'
                    )}
                  >
                    <item.icon className="h-3 w-3 flex-shrink-0" />
                    {formatValue(item)}
                  </span>
                ) : (
                  <span
                    className={cn(
                      'font-medium',
                      item.bold && 'font-bold',
                      item.highlight === 'danger' && 'text-red-600 dark:text-red-400',
                      item.highlight === 'warning' && 'text-amber-600 dark:text-amber-400',
                      item.highlight === 'success' && 'text-emerald-600 dark:text-emerald-400',
                      item.highlight === 'muted' && 'text-gray-400 dark:text-gray-500',
                      !item.highlight && 'text-gray-900 dark:text-white'
                    )}
                  >
                    {formatValue(item)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default CommandGrid;

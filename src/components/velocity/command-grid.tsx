'use client';

/**
 * Command Grid Component
 *
 * 3-column expanded section layout for velocity cards.
 * Columns: THE ASSET | THE HISTORY | THE INTELLIGENCE
 */

import {
  Wrench,
  History,
  Brain,
  MapPin,
  Thermometer,
  Calendar,
  DollarSign,
  User,
  Clock,
  AlertTriangle,
  Shield,
  Key,
  Dog,
  Flame,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Lead, Job, VelocityArchetype } from '@/types/database';
import { extractSignals, isEquipmentOld, getRefrigerantStatus, getHazardLabel } from '@/lib/extract-signals';
import { formatDollarEstimate } from '@/lib/velocity';
import { useCustomerHistory, summarizeHistory } from '@/hooks/use-customer-history';
import { differenceInDays, format } from 'date-fns';

// ============================================================================
// TYPES
// ============================================================================

interface GridItem {
  label: string;
  value: string | number | null;
  highlight?: 'danger' | 'warning' | 'success' | 'muted';
  bold?: boolean;
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
// COLUMN BUILDERS
// ============================================================================

function buildHazardColumns(item: VelocityItem): GridColumn[] {
  const text = getTranscriptText(item);
  const signals = extractSignals(text);
  const lead = item as Lead;

  // THE ASSET
  const assetItems: GridItem[] = [
    {
      label: 'Location',
      value: signals.unitLocation || 'Unknown',
    },
    {
      label: 'Fuel Type',
      value: signals.hazardType === 'gas' ? 'Natural Gas'
        : signals.hazardType === 'electrical' ? 'Electric'
          : signals.hazardType === 'water' ? 'Plumbing'
            : 'Unknown',
    },
    {
      label: 'Shut-off',
      value: signals.shutOffInfo || 'Verify on-site',
      highlight: signals.shutOffInfo ? 'success' : 'warning',
    },
  ];

  // THE HISTORY (would need customer history hook in real implementation)
  const historyItems: GridItem[] = [
    {
      label: 'Last Tech',
      value: 'Unknown', // Would come from customer history
    },
    {
      label: 'Last Visit',
      value: 'Unknown', // Would come from customer history
    },
    {
      label: 'Safety Notes',
      value: signals.accessNotes[0] || 'None on file',
    },
  ];

  // THE INTELLIGENCE
  const intelligenceItems: GridItem[] = [];

  if (signals.evacuationNeeded) {
    intelligenceItems.push({
      label: 'Recommendation',
      value: 'Advise evacuation',
      highlight: 'danger',
      bold: true,
    });
  }

  if (signals.occupants.length > 0) {
    intelligenceItems.push({
      label: 'Occupants',
      value: signals.occupants.join(', '),
      highlight: 'warning',
    });
  }

  if (signals.urgencyKeywords.length > 0) {
    intelligenceItems.push({
      label: 'Detected',
      value: `"${signals.urgencyKeywords[0]}"`,
    });
  }

  if (intelligenceItems.length === 0) {
    intelligenceItems.push({
      label: 'AI Note',
      value: lead.ai_summary ? lead.ai_summary.slice(0, 50) + '...' : 'No AI notes',
    });
  }

  return [
    { title: 'The Asset', icon: Wrench, items: assetItems },
    { title: 'The History', icon: History, items: historyItems },
    { title: 'The Intel', icon: Brain, items: intelligenceItems },
  ];
}

function buildRevenueColumns(item: VelocityItem): GridColumn[] {
  const text = getTranscriptText(item);
  const signals = extractSignals(text);
  const lead = item as Lead;

  const age = signals.equipmentAge || (lead.equipment_age ? parseInt(lead.equipment_age, 10) : null);
  const refrigerantStatus = getRefrigerantStatus(signals.refrigerantType);

  // THE ASSET
  const assetItems: GridItem[] = [
    {
      label: 'Make/Model',
      value: signals.equipmentMake || lead.equipment_type || 'Unknown',
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

  // THE HISTORY
  const historyItems: GridItem[] = [
    {
      label: 'Repairs (L12M)',
      value: 'Unknown', // Would come from customer history
    },
    {
      label: 'Total Spent',
      value: 'Unknown', // Would come from customer history
    },
    {
      label: 'Membership',
      value: 'Unknown', // Would come from customer data
    },
  ];

  // THE INTELLIGENCE
  const intelligenceItems: GridItem[] = [];

  if (signals.financingMentioned) {
    intelligenceItems.push({
      label: 'Signal',
      value: 'Financing interest',
      highlight: 'success',
    });
  }

  if (signals.replacementMentioned) {
    intelligenceItems.push({
      label: 'Signal',
      value: 'Replacement mention',
      highlight: 'success',
    });
  }

  if (signals.competitorMentioned) {
    intelligenceItems.push({
      label: 'Competitor',
      value: signals.competitorMentioned,
      highlight: 'warning',
    });
  }

  if (intelligenceItems.length === 0 && lead.ai_summary) {
    intelligenceItems.push({
      label: 'AI Note',
      value: lead.ai_summary.slice(0, 60) + (lead.ai_summary.length > 60 ? '...' : ''),
    });
  }

  return [
    { title: 'The Asset', icon: Wrench, items: assetItems },
    { title: 'The History', icon: History, items: historyItems },
    { title: 'The Intel', icon: Brain, items: intelligenceItems },
  ];
}

function buildRecoveryColumns(item: VelocityItem): GridColumn[] {
  const text = getTranscriptText(item);
  const signals = extractSignals(text);
  const lead = item as Lead;

  const daysSinceCreated = differenceInDays(new Date(), new Date(item.created_at));

  // THE ASSET
  const assetItems: GridItem[] = [
    {
      label: 'Original Service',
      value: lead.issue_description || 'Unknown',
    },
    {
      label: 'Original Tech',
      value: 'Unknown', // Would come from related job
    },
    {
      label: 'Warranty',
      value: /warranty/i.test(text) ? 'May apply' : 'Check status',
      highlight: /warranty/i.test(text) ? 'warning' : undefined,
    },
  ];

  // THE HISTORY
  const historyItems: GridItem[] = [
    {
      label: 'Days Since',
      value: `${daysSinceCreated} days`,
      highlight: daysSinceCreated <= 7 ? 'danger' : daysSinceCreated <= 30 ? 'warning' : undefined,
    },
    {
      label: 'Callback #',
      value: '1st', // Would track callback attempts
    },
    {
      label: 'Resolution',
      value: lead.callback_outcome || 'Pending',
    },
  ];

  // THE INTELLIGENCE
  const intelligenceItems: GridItem[] = [];

  const sentimentScore = lead.sentiment_score;
  if (sentimentScore !== null && sentimentScore !== undefined) {
    intelligenceItems.push({
      label: 'Sentiment',
      value: `${sentimentScore}/5`,
      highlight: sentimentScore <= 2 ? 'danger' : sentimentScore === 3 ? 'warning' : 'success',
      bold: sentimentScore <= 2,
    });
  }

  if (signals.customerQuotes.length > 0) {
    intelligenceItems.push({
      label: 'Quote',
      value: `"${signals.customerQuotes[0].slice(0, 40)}..."`,
    });
  }

  if (signals.sentimentKeywords.length > 0) {
    intelligenceItems.push({
      label: 'Mood',
      value: signals.sentimentKeywords[0],
      highlight: ['angry', 'frustrated', 'furious'].includes(signals.sentimentKeywords[0]) ? 'danger' : 'warning',
    });
  }

  if (intelligenceItems.length === 0) {
    intelligenceItems.push({
      label: 'Risk',
      value: lead.priority_reason || 'Assess on call',
    });
  }

  return [
    { title: 'The Asset', icon: Shield, items: assetItems },
    { title: 'The History', icon: History, items: historyItems },
    { title: 'The Intel', icon: Brain, items: intelligenceItems },
  ];
}

function buildLogisticsColumns(item: VelocityItem): GridColumn[] {
  const text = getTranscriptText(item);
  const signals = extractSignals(text);
  const lead = item as Lead;

  // THE ASSET
  const assetItems: GridItem[] = [
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

  // THE HISTORY
  const historyItems: GridItem[] = [
    {
      label: 'Last Visit',
      value: 'Unknown', // Would come from customer history
    },
    {
      label: 'Customer Tier',
      value: /member|vip|gold/i.test(text) ? 'Member' : 'Standard',
    },
    {
      label: 'Preferred Time',
      value: lead.time_preference || 'Flexible',
    },
  ];

  // THE INTELLIGENCE
  const intelligenceItems: GridItem[] = [];

  if (signals.gateCode) {
    intelligenceItems.push({
      label: 'Gate Code',
      value: signals.gateCode,
      highlight: 'success',
    });
  }

  if (signals.petWarning) {
    intelligenceItems.push({
      label: 'Pet Warning',
      value: signals.petWarning,
      highlight: 'warning',
    });
  }

  if (signals.keyLocation) {
    intelligenceItems.push({
      label: 'Key',
      value: signals.keyLocation,
    });
  }

  if (signals.accessNotes.length > 0) {
    intelligenceItems.push({
      label: 'Access',
      value: signals.accessNotes[0],
      highlight: 'warning',
    });
  }

  if (intelligenceItems.length === 0) {
    intelligenceItems.push({
      label: 'Notes',
      value: lead.ai_summary ? lead.ai_summary.slice(0, 50) + '...' : 'No special notes',
    });
  }

  return [
    { title: 'The Asset', icon: Wrench, items: assetItems },
    { title: 'The History', icon: History, items: historyItems },
    { title: 'Site Access', icon: Key, items: intelligenceItems },
  ];
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

  return (
    <div
      className={cn(
        'grid grid-cols-3 gap-3 p-4 rounded-lg',
        'bg-gray-50 dark:bg-gray-800/50',
        'border border-gray-100 dark:border-gray-700/50',
        className
      )}
    >
      {columns.map((column) => (
        <div key={column.title} className="min-w-0">
          {/* Column Header */}
          <div className="flex items-center gap-1.5 mb-2">
            <column.icon className="h-3 w-3 text-gray-400 flex-shrink-0" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">
              {column.title}
            </span>
          </div>

          {/* Column Items */}
          <div className="space-y-1.5">
            {column.items.map((item, idx) => (
              <div key={`${column.title}-${idx}`} className="text-xs">
                <span className="text-gray-500 dark:text-gray-400">
                  {item.label}:{' '}
                </span>
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
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default CommandGrid;

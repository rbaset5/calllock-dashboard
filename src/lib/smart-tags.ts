/**
 * Smart Tags System
 *
 * Generates dynamic, derived tags for velocity cards based on
 * transcript analysis and data signals.
 */

import type { Lead, Job, VelocityArchetype } from '@/types/database';
import { extractSignals, getRefrigerantStatus, isEquipmentOld } from './extract-signals';
import { formatDollarEstimate } from './velocity';
import { differenceInDays } from 'date-fns';

// ============================================================================
// TYPES
// ============================================================================

export type TagVariant =
  | 'red'
  | 'amber'
  | 'green'
  | 'blue'
  | 'purple'
  | 'slate'
  | 'gray';

export interface SmartTag {
  label: string;
  variant: TagVariant;
  priority: number;      // Lower = higher priority (for sorting)
  icon?: string;         // Lucide icon name
}

type VelocityItem = Lead | Job;

// ============================================================================
// HELPERS
// ============================================================================

function isLead(item: VelocityItem): item is Lead {
  return 'issue_description' in item;
}

function getTranscriptText(item: VelocityItem): string {
  return item.ai_summary || (item as Lead).call_transcript || '';
}

function getCity(address: string | null): string {
  if (!address) return '';
  const parts = address.split(',');
  if (parts.length >= 2) {
    return parts[1].trim();
  }
  return '';
}

// ============================================================================
// TAG RULE DEFINITIONS
// ============================================================================

interface TagRule {
  condition: (item: VelocityItem, transcript: string) => boolean;
  tag: SmartTag;
}

const HAZARD_RULES: TagRule[] = [
  // Evacuation needed
  {
    condition: (item, transcript) => {
      const signals = extractSignals(transcript);
      return signals.evacuationNeeded;
    },
    tag: { label: 'Evacuate', variant: 'red', priority: 0, icon: 'AlertTriangle' },
  },
  // Occupied home
  {
    condition: (item, transcript) => {
      const signals = extractSignals(transcript);
      return signals.occupants.length > 0;
    },
    tag: { label: 'Occupied', variant: 'red', priority: 1, icon: 'Home' },
  },
  // Gas hazard
  {
    condition: (item, transcript) => {
      const signals = extractSignals(transcript);
      return signals.hazardType === 'gas';
    },
    tag: { label: 'Gas', variant: 'red', priority: 2 },
  },
  // CO hazard
  {
    condition: (item, transcript) => {
      const signals = extractSignals(transcript);
      return signals.hazardType === 'carbon_monoxide';
    },
    tag: { label: 'CO Risk', variant: 'red', priority: 2 },
  },
  // Electrical hazard
  {
    condition: (item, transcript) => {
      const signals = extractSignals(transcript);
      return signals.hazardType === 'electrical';
    },
    tag: { label: 'Electrical', variant: 'amber', priority: 3 },
  },
  // Water damage
  {
    condition: (item, transcript) => {
      const signals = extractSignals(transcript);
      return signals.hazardType === 'water';
    },
    tag: { label: 'Water', variant: 'blue', priority: 3 },
  },
  // Emergency urgency
  {
    condition: (item) => {
      const lead = item as Lead;
      return lead.urgency === 'emergency';
    },
    tag: { label: 'Emergency', variant: 'red', priority: 1 },
  },
];

const REVENUE_RULES: TagRule[] = [
  // Financing asked
  {
    condition: (item, transcript) => {
      const signals = extractSignals(transcript);
      return signals.financingMentioned;
    },
    tag: { label: 'Financing Asked', variant: 'green', priority: 0, icon: 'CreditCard' },
  },
  // Replacement ready
  {
    condition: (item, transcript) => {
      const signals = extractSignals(transcript);
      const age = signals.equipmentAge || parseInt((item as Lead).equipment_age || '0', 10);
      return signals.replacementMentioned || age >= 15;
    },
    tag: { label: 'Replacement Ready', variant: 'amber', priority: 1 },
  },
  // R-22 obsolete
  {
    condition: (item, transcript) => {
      const signals = extractSignals(transcript);
      return getRefrigerantStatus(signals.refrigerantType) === 'obsolete';
    },
    tag: { label: 'R-22 System', variant: 'amber', priority: 2 },
  },
  // High value
  {
    condition: (item) => {
      const value = item.estimated_value;
      return value !== null && value >= 5000;
    },
    tag: { label: '$5K+', variant: 'green', priority: 1 },
  },
  // Very high value
  {
    condition: (item) => {
      const value = item.estimated_value;
      return value !== null && value >= 10000;
    },
    tag: { label: '$10K+', variant: 'green', priority: 0 },
  },
  // Hot lead
  {
    condition: (item, transcript) => {
      const signals = extractSignals(transcript);
      return signals.replacementMentioned && signals.financingMentioned;
    },
    tag: { label: 'Hot Lead', variant: 'red', priority: 0, icon: 'Flame' },
  },
  // Replacement tier
  {
    condition: (item) => item.revenue_tier === 'replacement',
    tag: { label: 'Replacement', variant: 'amber', priority: 2 },
  },
];

const RECOVERY_RULES: TagRule[] = [
  // Review risk (very low sentiment)
  {
    condition: (item) => {
      const lead = item as Lead;
      return lead.sentiment_score !== null && lead.sentiment_score <= 2;
    },
    tag: { label: 'Review Risk', variant: 'red', priority: 0, icon: 'AlertCircle' },
  },
  // Recall risk (recent job)
  {
    condition: (item) => {
      const days = differenceInDays(new Date(), new Date(item.created_at));
      return days <= 30;
    },
    tag: { label: 'Recall Risk', variant: 'amber', priority: 1 },
  },
  // High churn risk
  {
    condition: (item, transcript) => {
      const signals = extractSignals(transcript);
      return signals.sentimentKeywords.some(k =>
        ['angry', 'frustrated', 'furious', 'livid'].includes(k)
      );
    },
    tag: { label: 'High Churn', variant: 'red', priority: 0 },
  },
  // Warranty concern
  {
    condition: (item, transcript) => {
      return /warranty|guarantee|labor/i.test(transcript);
    },
    tag: { label: 'Warranty', variant: 'purple', priority: 2 },
  },
  // Callback risk
  {
    condition: (item) => {
      const lead = item as Lead;
      return lead.priority_color === 'red';
    },
    tag: { label: 'Callback Risk', variant: 'red', priority: 1 },
  },
  // Moderate sentiment
  {
    condition: (item) => {
      const lead = item as Lead;
      return lead.sentiment_score === 3;
    },
    tag: { label: 'Concerned', variant: 'amber', priority: 2 },
  },
];

const LOGISTICS_RULES: TagRule[] = [
  // VIP / Member
  {
    condition: (item, transcript) => {
      return /member|membership|vip|gold|platinum/i.test(transcript);
    },
    tag: { label: 'VIP', variant: 'purple', priority: 0, icon: 'Crown' },
  },
  // Pet warning
  {
    condition: (item, transcript) => {
      const signals = extractSignals(transcript);
      return signals.petWarning !== null;
    },
    tag: { label: 'Pet', variant: 'amber', priority: 1, icon: 'Dog' },
  },
  // Gate code required
  {
    condition: (item, transcript) => {
      const signals = extractSignals(transcript);
      return signals.gateCode !== null;
    },
    tag: { label: 'Gate Code', variant: 'blue', priority: 2, icon: 'Key' },
  },
  // Difficult access
  {
    condition: (item, transcript) => {
      const signals = extractSignals(transcript);
      return signals.accessNotes.length > 0;
    },
    tag: { label: 'Access Note', variant: 'gray', priority: 3 },
  },
  // Tune-up / Maintenance
  {
    condition: (item) => {
      const lead = item as Lead;
      return lead.work_type === 'maintenance' ||
        /tune[\s-]?up|maintenance|seasonal/i.test(lead.issue_description || '');
    },
    tag: { label: 'Tune-up', variant: 'blue', priority: 2 },
  },
  // Time preference stated
  {
    condition: (item) => {
      const lead = item as Lead;
      return Boolean(lead.time_preference && lead.time_preference.length > 0);
    },
    tag: { label: 'Time Pref', variant: 'slate', priority: 3 },
  },
];

// ============================================================================
// TAG BUILDERS
// ============================================================================

function buildTagsFromRules(
  item: VelocityItem,
  rules: TagRule[],
  maxTags: number = 4
): SmartTag[] {
  const transcript = getTranscriptText(item);

  const matchedTags = rules
    .filter(rule => rule.condition(item, transcript))
    .map(rule => rule.tag)
    .sort((a, b) => a.priority - b.priority);

  // Deduplicate by label
  const seen = new Set<string>();
  const uniqueTags: SmartTag[] = [];

  for (const tag of matchedTags) {
    if (!seen.has(tag.label)) {
      seen.add(tag.label);
      uniqueTags.push(tag);
    }
  }

  return uniqueTags.slice(0, maxTags);
}

/**
 * Add a location tag based on address city.
 */
function addLocationTag(tags: SmartTag[], item: VelocityItem): SmartTag[] {
  const city = getCity(item.customer_address);
  if (city && tags.length < 4) {
    tags.push({
      label: city,
      variant: 'gray',
      priority: 100, // Low priority
    });
  }
  return tags;
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

/**
 * Build smart tags for a velocity card based on archetype.
 * Returns up to 4 tags, sorted by priority.
 */
export function buildSmartTags(
  item: VelocityItem,
  archetype: VelocityArchetype
): SmartTag[] {
  let tags: SmartTag[];

  switch (archetype) {
    case 'HAZARD':
      tags = buildTagsFromRules(item, HAZARD_RULES);
      break;
    case 'REVENUE':
      tags = buildTagsFromRules(item, REVENUE_RULES);
      break;
    case 'RECOVERY':
      tags = buildTagsFromRules(item, RECOVERY_RULES);
      break;
    case 'LOGISTICS':
    default:
      tags = buildTagsFromRules(item, LOGISTICS_RULES);
      break;
  }

  // Add location tag if there's room
  return addLocationTag(tags, item);
}

/**
 * Get Tailwind classes for a tag variant.
 */
export function getTagClasses(variant: TagVariant): string {
  switch (variant) {
    case 'red':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    case 'amber':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    case 'green':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
    case 'blue':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    case 'purple':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
    case 'slate':
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    case 'gray':
    default:
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  }
}

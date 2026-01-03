/**
 * Velocity Triage System
 *
 * This module provides derivative logic to determine the "archetype" of a lead or job
 * based on existing fields (urgency, priority_color, revenue_tier, estimated_value).
 *
 * The archetype is NOT stored in the database - it's calculated at runtime.
 * This keeps priority_color as the source of truth while adding a higher-level
 * classification for specialized UI rendering.
 *
 * Precedence (STRICT - order matters):
 * 1. HAZARD: urgency === 'emergency' | 'high' (safety first)
 * 2. RECOVERY: priority_color === 'red' (relationship rescue - protect before grow)
 * 3. REVENUE: revenue_tier in [replacement, major_repair] | estimated_value >= $1500 | priority_color === 'green'
 * 4. LOGISTICS: everything else
 *
 * IMPORTANT: RECOVERY beats REVENUE because a frustrated high-value customer
 * is a reputation emergency. One 1-star review can cost 30 leads. If the customer
 * is already angry, you must save the relationship before pursuing the sale.
 */

import type { Lead, Job, VelocityArchetype, RevenueTier, PriorityColor, UrgencyLevel } from '@/types/database';
import type { TaxonomyTags } from './tag-taxonomy-mapper';

type ItemWithUrgency = { urgency?: UrgencyLevel | null };
type ItemWithPriorityColor = { priority_color?: PriorityColor | null };
type ItemWithRevenueTier = { revenue_tier?: RevenueTier | null };
type ItemWithCreatedAt = { created_at: string };
type ItemWithEstimatedValue = { estimated_value?: number | null };
type ItemWithSentimentScore = { sentiment_score?: number | null };
type ItemWithTags = { tags?: TaxonomyTags | null };

export type VelocityItem = (Lead | Job) & ItemWithCreatedAt & ItemWithTags;

const HAZARD_TAGS = ['GAS_LEAK', 'CO_EVENT', 'ELECTRICAL_FIRE', 'ACTIVE_FLOODING', 'HEALTH_RISK', 'REFRIGERANT_LEAK'];
const RECOVERY_TAGS = ['CALLBACK_RISK', 'COMPLAINT_PRICE', 'COMPLAINT_SERVICE', 'COMPLAINT_NOFIX', 'ESCALATION_REQ', 'REVIEW_THREAT', 'LEGAL_MENTION', 'REFUND_REQ', 'LOST_CUSTOMER'];
const REVENUE_TAGS = ['HOT_LEAD', 'R22_RETROFIT', 'REPLACE_OPP', 'COMMERCIAL_LEAD', 'FINANCING_REQ', 'MULTI_PROPERTY'];

/**
 * Determine the velocity archetype for a lead or job.
 *
 * This is DERIVATIVE logic - priority_color remains the source of truth.
 *
 * Hierarchy (STRICT PRECEDENCE):
 * 1. HAZARD: urgency === 'emergency' | 'high' (safety first)
 * 2. RECOVERY: priority_color === 'red' (relationship rescue - protect before grow)
 * 3. REVENUE: revenue_tier in [replacement, major_repair] | estimated_value >= $1500 | priority_color === 'green'
 * 4. LOGISTICS: everything else
 *
 * NOTE: RECOVERY beats REVENUE. A frustrated high-value customer is a reputation
 * emergency first. Saving the relationship unlocks the revenue; hard-selling
 * an angry customer closes both doors.
 */
export function determineArchetype(item: VelocityItem): VelocityArchetype {
  const urgency = (item as ItemWithUrgency).urgency;
  const priorityColor = (item as ItemWithPriorityColor).priority_color;
  const revenueTier = (item as ItemWithRevenueTier).revenue_tier;
  const estimatedValue = (item as ItemWithEstimatedValue).estimated_value;
  const tags = (item as ItemWithTags).tags;

  const hasHazardTag = tags?.HAZARD?.some(t => HAZARD_TAGS.includes(t)) ?? false;
  const hasRecoveryTag = tags?.RECOVERY?.some(t => RECOVERY_TAGS.includes(t)) ?? false;
  const hasRevenueTag = tags?.REVENUE?.some(t => REVENUE_TAGS.includes(t)) ?? false;

  if (urgency === 'emergency' || urgency === 'high' || hasHazardTag) {
    return 'HAZARD';
  }

  if (priorityColor === 'red' || hasRecoveryTag) {
    return 'RECOVERY';
  }

  if (
    revenueTier === 'replacement' ||
    revenueTier === 'major_repair' ||
    (estimatedValue && estimatedValue >= 1500) ||
    priorityColor === 'green' ||
    hasRevenueTag
  ) {
    return 'REVENUE';
  }

  return 'LOGISTICS';
}

/**
 * Base score weights for velocity sorting.
 * Higher score = more urgent/important = appears first.
 *
 * Precedence: HAZARD > RECOVERY > REVENUE > LOGISTICS
 *
 * These are base scores that ensure archetype ordering. Within each archetype,
 * composite scoring adds bonus points based on value, time, and other factors.
 */
const ARCHETYPE_BASE_SCORES: Record<VelocityArchetype, number> = {
  HAZARD: 1000,    // Safety first - always top
  RECOVERY: 700,   // Relationship rescue - protect before grow
  REVENUE: 400,    // Growth opportunities
  LOGISTICS: 100,  // Routine follow-up
};

/**
 * Calculate velocity score for sorting.
 * Higher score = more urgent/important = appears first.
 *
 * Scoring is archetype-aware:
 * - HAZARD: Base 1000 + time-sensitivity + symptom severity
 * - RECOVERY: Base 700 + value (front-loaded) + time (higher ceiling so nothing dies)
 * - REVENUE: Base 400 + value + time
 * - LOGISTICS: Base 100 + time (oldest first SLA)
 *
 * Key insight: Within RECOVERY, high-value angry customers top the list initially,
 * but older items eventually catch up to prevent queue stagnation.
 */
export function calculateVelocityScore(item: VelocityItem): number {
  const archetype = determineArchetype(item);
  const estimatedValue = (item as ItemWithEstimatedValue).estimated_value;
  const revenueTier = (item as ItemWithRevenueTier).revenue_tier;
  const urgency = (item as ItemWithUrgency).urgency;
  const sentimentScore = (item as ItemWithSentimentScore).sentiment_score;
  const tags = (item as ItemWithTags).tags;

  let score = ARCHETYPE_BASE_SCORES[archetype];

  const createdAt = new Date(item.created_at);
  const hoursOld = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);

  switch (archetype) {
    case 'HAZARD':
      score += Math.min(hoursOld * 10, 50);
      if (urgency === 'emergency') score += 30;
      if (tags?.HAZARD?.includes('GAS_LEAK') || tags?.HAZARD?.includes('CO_EVENT')) score += 40;
      if (tags?.HAZARD?.includes('ELECTRICAL_FIRE')) score += 35;
      if (tags?.CONTEXT?.includes('ELDERLY_OCCUPANT') || tags?.CONTEXT?.includes('INFANT_NEWBORN')) score += 20;
      break;

    case 'RECOVERY':
      if (estimatedValue && estimatedValue >= 1500) score += 40;
      if (revenueTier === 'replacement') score += 30;
      score += Math.min(hoursOld * 5, 60);
      if (sentimentScore !== null && sentimentScore !== undefined) {
        if (sentimentScore <= 2) score += 25;
        else if (sentimentScore === 3) score += 10;
      }
      if (tags?.RECOVERY?.includes('REVIEW_THREAT') || tags?.RECOVERY?.includes('LEGAL_MENTION')) score += 35;
      if (tags?.RECOVERY?.includes('ESCALATION_REQ')) score += 25;
      break;

    case 'REVENUE':
      if (estimatedValue) score += Math.min(estimatedValue / 100, 50);
      if (revenueTier === 'replacement') score += 30;
      score += Math.min(hoursOld * 3, 30);
      if (tags?.REVENUE?.includes('HOT_LEAD')) score += 25;
      if (tags?.REVENUE?.includes('COMMERCIAL_LEAD') || tags?.REVENUE?.includes('MULTI_PROPERTY')) score += 20;
      if (tags?.REVENUE?.includes('R22_RETROFIT')) score += 15;
      break;

    case 'LOGISTICS':
      score += Math.min(hoursOld * 2, 50);
      if (hoursOld > 24) score += 30;
      if (tags?.LOGISTICS?.includes('GATE_CODE') || tags?.LOGISTICS?.includes('LOCKBOX')) score += 5;
      break;
  }

  return score;
}

/**
 * Sort items by velocity score (descending - highest score first).
 */
export function sortByVelocity<T extends VelocityItem>(items: T[]): T[] {
  return [...items].sort((a, b) => calculateVelocityScore(b) - calculateVelocityScore(a));
}

/**
 * Group items by archetype.
 */
export function groupByArchetype<T extends VelocityItem>(
  items: T[]
): Record<VelocityArchetype, T[]> {
  const groups: Record<VelocityArchetype, T[]> = {
    HAZARD: [],
    RECOVERY: [],
    REVENUE: [],
    LOGISTICS: [],
  };

  for (const item of items) {
    const archetype = determineArchetype(item);
    groups[archetype].push(item);
  }

  return groups;
}

/**
 * Count items by archetype.
 */
export function countByArchetype<T extends VelocityItem>(
  items: T[]
): Record<VelocityArchetype, number> {
  const counts: Record<VelocityArchetype, number> = {
    HAZARD: 0,
    RECOVERY: 0,
    REVENUE: 0,
    LOGISTICS: 0,
  };

  for (const item of items) {
    const archetype = determineArchetype(item);
    counts[archetype]++;
  }

  return counts;
}

/**
 * Archetype display configuration for UI rendering.
 */
export const ARCHETYPE_CONFIG: Record<
  VelocityArchetype,
  {
    label: string;
    description: string;
    color: string;
    bgColor: string;
    borderColor: string;
    shadowColor: string;
    icon: 'AlertTriangle' | 'DollarSign' | 'PhoneCallback' | 'ClipboardList';
  }
> = {
  HAZARD: {
    label: 'HAZARD',
    description: 'Safety emergency - immediate attention required',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-500',
    shadowColor: 'shadow-red-500/20',
    icon: 'AlertTriangle',
  },
  RECOVERY: {
    label: 'RECOVERY',
    description: 'Callback risk - customer needs immediate follow-up',
    color: 'text-slate-100',
    bgColor: 'bg-slate-900',
    borderColor: 'border-slate-700',
    shadowColor: 'shadow-slate-900/30',
    icon: 'PhoneCallback',
  },
  REVENUE: {
    label: 'REVENUE',
    description: 'High-value opportunity',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-400',
    shadowColor: 'shadow-amber-500/20',
    icon: 'DollarSign',
  },
  LOGISTICS: {
    label: 'LOGISTICS',
    description: 'Standard lead - routine follow-up',
    color: 'text-gray-600',
    bgColor: 'bg-white',
    borderColor: 'border-gray-200',
    shadowColor: 'shadow-gray-200/50',
    icon: 'ClipboardList',
  },
};

/**
 * Get the icon name for an archetype.
 * Returns a Lucide icon name that can be imported dynamically.
 */
export function getArchetypeIcon(archetype: VelocityArchetype): string {
  return ARCHETYPE_CONFIG[archetype].icon;
}

/**
 * Check if an item is a Lead (has customer_address as optional).
 */
export function isLead(item: Lead | Job): item is Lead {
  return 'why_not_booked' in item || 'converted_job_id' in item;
}

/**
 * Check if an item is a Job (has scheduled_at).
 */
export function isJob(item: Lead | Job): item is Job {
  return 'scheduled_at' in item && !('converted_job_id' in item);
}

/**
 * Dollar estimate formatting result.
 */
export interface DollarEstimateResult {
  display: string;
  type: 'exact' | 'range' | 'floor' | 'tier';
}

/**
 * Revenue tier floor estimates (minimum expected value).
 */
const TIER_FLOOR_ESTIMATES: Record<RevenueTier, number> = {
  replacement: 5000,
  major_repair: 1500,
  standard_repair: 300,
  minor: 150,
  diagnostic: 89,
};

/**
 * Revenue tier display symbols.
 */
const TIER_SYMBOLS: Record<RevenueTier, string> = {
  replacement: '$$$$',
  major_repair: '$$$',
  standard_repair: '$$',
  minor: '$',
  diagnostic: '$',
};

/**
 * Format a number as currency.
 */
function formatCurrency(value: number): string {
  if (value >= 1000) {
    // Use K notation for values >= 1000
    const k = value / 1000;
    // If it's a clean K value, don't show decimal
    if (k === Math.floor(k)) {
      return `$${k}K`;
    }
    // Otherwise show one decimal
    return `$${k.toFixed(1).replace(/\.0$/, '')}K`;
  }
  // For smaller values, show full number
  return `$${value.toLocaleString()}`;
}

/**
 * Format dollar estimate for display on cards.
 *
 * Priority:
 * 1. If both estimatedValueLow and estimatedValueHigh exist: show range "$2K-4K"
 * 2. If exact estimatedValue exists: show exact "$2,500"
 * 3. If only estimatedValueLow exists: show floor "$150+"
 * 4. If only revenueTier exists: show tier-based floor estimate
 * 5. Fallback to tier symbol ("$$$$", "$$$", etc.)
 *
 * @param estimatedValue - Exact estimated value (if known)
 * @param revenueTier - Revenue tier classification
 * @param estimatedValueLow - Low end of estimate range
 * @param estimatedValueHigh - High end of estimate range
 * @returns Formatted display string and type
 */
export function formatDollarEstimate(
  estimatedValue: number | null | undefined,
  revenueTier: RevenueTier | null | undefined,
  estimatedValueLow?: number | null,
  estimatedValueHigh?: number | null
): DollarEstimateResult {
  // 1. Range estimate (if both low and high exist)
  if (estimatedValueLow && estimatedValueHigh && estimatedValueLow !== estimatedValueHigh) {
    return {
      display: `${formatCurrency(estimatedValueLow)}-${formatCurrency(estimatedValueHigh).replace('$', '')}`,
      type: 'range',
    };
  }

  // 2. Exact estimate
  if (estimatedValue && estimatedValue > 0) {
    return {
      display: formatCurrency(estimatedValue),
      type: 'exact',
    };
  }

  // 3. Floor estimate (only low exists)
  if (estimatedValueLow && estimatedValueLow > 0) {
    return {
      display: `${formatCurrency(estimatedValueLow)}+`,
      type: 'floor',
    };
  }

  // 4. Tier-based floor estimate
  if (revenueTier && TIER_FLOOR_ESTIMATES[revenueTier]) {
    return {
      display: `${formatCurrency(TIER_FLOOR_ESTIMATES[revenueTier])}+`,
      type: 'floor',
    };
  }

  // 5. Tier symbol fallback
  if (revenueTier && TIER_SYMBOLS[revenueTier]) {
    return {
      display: TIER_SYMBOLS[revenueTier],
      type: 'tier',
    };
  }

  // No estimate available
  return {
    display: '',
    type: 'tier',
  };
}

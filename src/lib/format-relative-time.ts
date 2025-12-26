/**
 * Relative Time Formatting
 *
 * Provides human-readable relative time strings ("5 min ago", "2h ago")
 * and urgency detection for time-sensitive archetypes.
 */

import type { VelocityArchetype } from '@/types/database';

/**
 * Format a date string as a human-readable relative time.
 *
 * @param dateStr - ISO date string or parseable date
 * @returns Relative time string like "5 min ago", "2h ago", "Yesterday"
 */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Future dates (shouldn't happen but handle gracefully)
  if (diffMs < 0) {
    return 'just now';
  }

  // Under 1 minute
  if (diffMins < 1) {
    return 'just now';
  }

  // Under 60 minutes
  if (diffMins < 60) {
    return `${diffMins} min ago`;
  }

  // Under 24 hours
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  // Yesterday
  if (diffDays === 1) {
    return 'Yesterday';
  }

  // Within a week
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  // Older - show date
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Time urgency levels for visual styling.
 */
export type TimeUrgency = 'critical' | 'warning' | 'normal';

/**
 * Urgency thresholds by archetype (in minutes).
 */
const URGENCY_THRESHOLDS: Record<VelocityArchetype, { critical: number; warning: number }> = {
  HAZARD: { critical: 10, warning: 5 }, // 10+ min = critical, 5+ min = warning
  RECOVERY: { critical: 120, warning: 60 }, // 2+ hours = critical, 1+ hour = warning
  REVENUE: { critical: 60, warning: 30 }, // 1+ hour = critical, 30+ min = warning
  LOGISTICS: { critical: 480, warning: 240 }, // 8+ hours = critical, 4+ hours = warning
};

/**
 * Determine the urgency level based on time elapsed and archetype.
 *
 * @param dateStr - ISO date string of when the item was created
 * @param archetype - The velocity archetype of the item
 * @returns Urgency level: 'critical' | 'warning' | 'normal'
 */
export function getTimeUrgency(dateStr: string, archetype: VelocityArchetype): TimeUrgency {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMins = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  const thresholds = URGENCY_THRESHOLDS[archetype];

  if (diffMins >= thresholds.critical) {
    return 'critical';
  }

  if (diffMins >= thresholds.warning) {
    return 'warning';
  }

  return 'normal';
}

/**
 * Get CSS classes for time display based on urgency.
 *
 * @param urgency - The urgency level
 * @returns Tailwind CSS classes for styling
 */
export function getTimeUrgencyClasses(urgency: TimeUrgency): string {
  switch (urgency) {
    case 'critical':
      return 'text-red-600 font-semibold';
    case 'warning':
      return 'text-amber-600 font-medium';
    case 'normal':
    default:
      return 'text-gray-500';
  }
}

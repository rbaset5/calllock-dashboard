/**
 * Smart Summary Generation
 *
 * Generates concise, archetype-aware summaries from lead/job data.
 * Used as fallback until AI provides dedicated smart_summary field.
 */

import type { VelocityArchetype, Lead, Job } from '@/types/database';

type VelocityItem = Lead | Job;

/**
 * Maximum length for smart summaries.
 */
const MAX_SUMMARY_LENGTH = 60;

/**
 * Truncate text at word boundary with ellipsis.
 */
export function truncateWithEllipsis(text: string, maxLength: number = MAX_SUMMARY_LENGTH): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;

  // Find the last space before maxLength
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  // If there's a reasonable word boundary, use it
  if (lastSpace > maxLength * 0.6) {
    return truncated.slice(0, lastSpace) + '...';
  }

  // Otherwise just truncate at max length
  return truncated.slice(0, maxLength - 3) + '...';
}

/**
 * Get the issue description from a lead or job.
 */
function getIssueDescription(item: VelocityItem): string {
  // Lead has issue_description
  if ('issue_description' in item && item.issue_description) {
    return item.issue_description;
  }
  // Job might have problem_description or service_type
  if ('problem_description' in item && (item as any).problem_description) {
    return (item as any).problem_description;
  }
  if ('service_type' in item && (item as any).service_type) {
    return (item as any).service_type;
  }
  // Fallback to AI summary
  if ('ai_summary' in item && item.ai_summary) {
    return item.ai_summary;
  }
  return 'Service request';
}

/**
 * Generate a HAZARD summary - emphasizes the emergency nature.
 */
function getHazardSummary(item: VelocityItem): string {
  const issue = getIssueDescription(item);

  // If issue already mentions emergency keywords, don't prefix
  const lowerIssue = issue.toLowerCase();
  if (lowerIssue.includes('emergency') || lowerIssue.includes('urgent')) {
    return truncateWithEllipsis(issue);
  }

  return truncateWithEllipsis(issue);
}

/**
 * Generate a REVENUE summary - emphasizes the opportunity.
 */
function getRevenueSummary(item: VelocityItem): string {
  const issue = getIssueDescription(item);
  const lead = item as Lead;

  // If we have equipment info, include it
  if (lead.equipment_type) {
    const equipmentPart = lead.equipment_type;
    const tierPart = lead.revenue_tier === 'replacement'
      ? 'replacement'
      : lead.revenue_tier === 'major_repair'
        ? 'major repair'
        : '';

    if (tierPart) {
      return truncateWithEllipsis(`${equipmentPart} ${tierPart} - ${issue}`);
    }
  }

  return truncateWithEllipsis(issue);
}

/**
 * Generate a RECOVERY summary - emphasizes the customer concern.
 */
function getRecoverySummary(item: VelocityItem): string {
  const lead = item as Lead;

  // Priority reason is often the most relevant for recovery
  if (lead.priority_reason) {
    return truncateWithEllipsis(lead.priority_reason);
  }

  const issue = getIssueDescription(item);
  return truncateWithEllipsis(issue);
}

/**
 * Generate a LOGISTICS summary - straightforward service description.
 */
function getLogisticsSummary(item: VelocityItem): string {
  const issue = getIssueDescription(item);
  const lead = item as Lead;

  // If there's timing info, append it
  if (lead.time_preference) {
    return truncateWithEllipsis(`${issue} · ${lead.time_preference}`);
  }

  return truncateWithEllipsis(issue);
}

/**
 * Generate a smart summary for display on velocity cards.
 *
 * This is a fallback generator that creates concise, archetype-aware
 * summaries from existing lead/job fields. When the AI agent is updated
 * to provide a dedicated `smart_summary` field, that should take precedence.
 *
 * @param item - The lead or job to summarize
 * @param archetype - The velocity archetype of the item
 * @returns A concise summary string (max 60 chars)
 */
export function getSmartSummary(item: VelocityItem, archetype: VelocityArchetype): string {
  // If item already has a smart_summary field from AI, use it
  if ('smart_summary' in item && (item as any).smart_summary) {
    return truncateWithEllipsis((item as any).smart_summary);
  }

  // Generate based on archetype
  switch (archetype) {
    case 'HAZARD':
      return getHazardSummary(item);
    case 'REVENUE':
      return getRevenueSummary(item);
    case 'RECOVERY':
      return getRecoverySummary(item);
    case 'LOGISTICS':
    default:
      return getLogisticsSummary(item);
  }
}

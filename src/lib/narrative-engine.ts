/**
 * Narrative Engine
 *
 * Builds smart, contextual narratives for velocity cards using
 * conditional templates with Full → Fallback chains.
 */

import type { Lead, Job, VelocityArchetype } from '@/types/database';
import { extractSignals, getHazardLabel, isEquipmentOld } from './extract-signals';
import { formatDollarEstimate } from './velocity';
import { formatDistanceToNow, differenceInDays } from 'date-fns';

// ============================================================================
// TYPES
// ============================================================================

export interface Warning {
  type: 'flash' | 'bold' | 'icon';
  field: string;
  message: string;
  icon?: string; // Lucide icon name
}

export interface NarrativeResult {
  headline: string;         // Main narrative sentence
  subtext?: string;         // Secondary context (optional)
  warnings: Warning[];      // UI indicators (flashing, bold, icons)
  highlightAge?: boolean;   // Should equipment age be bold?
}

type VelocityItem = Lead | Job;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function isLead(item: VelocityItem): item is Lead {
  return 'issue_description' in item;
}

function getTranscriptText(item: VelocityItem): string {
  return item.ai_summary || (item as Lead).call_transcript || '';
}

function getCity(address: string | null): string {
  if (!address) return '';

  // Skip invalid/placeholder addresses
  const invalid = ['not provided', 'unknown', 'n/a', 'none', 'tbd'];
  if (invalid.some(i => address.toLowerCase().includes(i))) return '';

  // Look for city in "123 Main St, Austin, TX" format
  const parts = address.split(',');
  if (parts.length >= 2) {
    const city = parts[1].trim().split(' ')[0];
    if (city && city.length > 2 && !/^\d/.test(city)) return city;
  }

  return '';
}

function capitalizeFirst(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function truncate(str: string, maxLength: number): string {
  if (!str || str.length <= maxLength) return str;

  // Cut at word boundary to avoid "Carrier un..." mid-word truncation
  const truncated = str.slice(0, maxLength - 3);
  const lastSpace = truncated.lastIndexOf(' ');

  // Only cut at space if it's past halfway point (avoid too-short results)
  if (lastSpace > maxLength / 2) {
    return truncated.slice(0, lastSpace) + '...';
  }
  return truncated + '...';
}

/**
 * Clean and extract usable narrative from ai_summary.
 * Removes system prefixes and garbage data, returns first 1-2 sentences.
 */
function cleanSummary(text: string | null | undefined): string {
  if (!text) return '';

  // Remove system prefixes like [EMERGENCY], [HIGH VALUE], etc.
  let clean = text
    .replace(/^\[(EMERGENCY|HIGH VALUE|REPLACEMENT|RECOVERY|CALLBACK)\]\s*/i, '')
    .replace(/^Outcome:\s*/i, '')
    .replace(/^The user called\s+\w+[^.]*\.\s*/i, '')
    .replace(/^Customer\s+(called|contacted)\s+/i, '')
    .trim();

  // Skip if it's just garbage
  const garbage = ['hvac', 'plumbing', 'electrical', 'service', 'n/a', 'none'];
  if (garbage.includes(clean.toLowerCase())) return '';

  // Get first 1-2 meaningful sentences
  const sentences = clean.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 5);
  if (sentences.length === 0) return clean.length > 10 ? clean : '';

  // Return first 2 sentences, truncated to ~100 chars
  const result = sentences.slice(0, 2).join(' ').trim();
  return truncate(result, 100);
}

/**
 * Check if a string is garbage/unhelpful data
 */
function isGarbageValue(str: string | null | undefined): boolean {
  if (!str) return true;
  const s = str.toLowerCase().trim();
  const garbage = ['hvac', 'plumbing', 'electrical', 'service', 'n/a', 'none', 'unknown'];
  return garbage.includes(s) || s.length < 4;
}

// ============================================================================
// HAZARD NARRATIVE
// ============================================================================

function buildHazardNarrative(item: VelocityItem): NarrativeResult {
  const text = getTranscriptText(item);
  const signals = extractSignals(text);
  const warnings: Warning[] = [];

  const customerName = item.customer_name || 'Customer';
  const address = item.customer_address;
  const issue = isLead(item) ? item.issue_description : (item as any).service_type;

  // Get hazard-specific info
  const hazardLabel = getHazardLabel(signals.hazardType);
  const symptom = signals.problemKeywords[0] || issue || 'issue reported';
  const threat = signals.evacuationNeeded ? 'Evacuation advised' : signals.hazardType ? `${hazardLabel} detected` : null;
  const status = signals.shutOffInfo ? capitalizeFirst(signals.shutOffInfo) : null;

  // Check for vague address
  if (!address || address.length < 10) {
    warnings.push({
      type: 'flash',
      field: 'address',
      message: 'Verify Address',
    });
  }

  // Check for occupied home
  if (signals.occupants.length > 0) {
    warnings.push({
      type: 'icon',
      field: 'occupants',
      message: `${signals.occupants.join(', ')} present`,
      icon: 'Home',
    });
  }

  // FULL template: Has hazard type + symptom
  if (signals.hazardType && symptom) {
    let headline = `${hazardLabel} reported by ${customerName}.`;
    if (symptom && symptom !== issue) {
      headline += ` Symptom: ${truncate(symptom, 40)}.`;
    }
    if (threat) {
      headline += ` ${threat}.`;
    }
    if (status) {
      headline += ` Status: ${status}.`;
    }

    return {
      headline: headline.trim(),
      subtext: address ? `at ${getCity(address)}` : undefined,
      warnings,
    };
  }

  // FALLBACK template: Missing specific hazard data
  const fallbackLocation = address ? `at ${truncate(address, 40)}` : 'at unknown location';
  const keyPhrase = signals.urgencyKeywords[0] || signals.problemKeywords[0] || issue || 'urgent issue';

  return {
    headline: `Urgent Safety Issue ${fallbackLocation}.`,
    subtext: `Detected: "${truncate(keyPhrase, 50)}"`,
    warnings,
  };
}

// ============================================================================
// REVENUE NARRATIVE
// ============================================================================

function buildRevenueNarrative(item: VelocityItem): NarrativeResult {
  const text = getTranscriptText(item);
  const signals = extractSignals(text);
  const warnings: Warning[] = [];

  const customerName = item.customer_name || 'Customer';
  const lead = item as Lead;

  // Get equipment age from signals or from lead field
  const age = signals.equipmentAge ||
    (lead.equipment_age ? parseInt(lead.equipment_age, 10) : null);

  // Get revenue info
  const estimatedValue = item.estimated_value;
  const revenueTier = item.revenue_tier;
  const dollarEstimate = formatDollarEstimate(estimatedValue, revenueTier);

  // Opportunity type
  const opportunityType = signals.replacementMentioned
    ? 'Replacement opportunity'
    : revenueTier === 'replacement'
      ? 'Replacement quote'
      : revenueTier === 'major_repair'
        ? 'Major repair opportunity'
        : 'Sales opportunity';

  // Interest signals
  const interests: string[] = [];
  if (signals.financingMentioned) interests.push('financing');
  if (signals.replacementMentioned) interests.push('new system');
  if (signals.refrigerantType === 'R-22' || signals.refrigerantType === 'FREON') {
    interests.push('R-22 upgrade');
  }

  // Bold age if old
  const highlightAge = isEquipmentOld(age);

  // FULL template: Has age + opportunity context
  if (age && (signals.replacementMentioned || revenueTier)) {
    let headline = `${opportunityType} for ${age}-year-old ${signals.refrigerantType || 'system'}.`;

    if (interests.length > 0) {
      headline += ` Customer interested in ${interests.join(', ')}.`;
    }

    return {
      headline,
      subtext: dollarEstimate.display ? `Est. value: ${dollarEstimate.display}` : undefined,
      warnings,
      highlightAge,
    };
  }

  // FALLBACK template: Missing specific equipment data
  const issue = isLead(item) ? item.issue_description : (item as any).service_type || '';
  const keywords = signals.problemKeywords.slice(0, 2).join(', ') || issue || 'service request';

  return {
    headline: `${opportunityType} detected. Topic: ${truncate(keywords, 40)}.`,
    subtext: dollarEstimate.display ? `Est. value: ${dollarEstimate.display}` : undefined,
    warnings,
    highlightAge: false,
  };
}

// ============================================================================
// RECOVERY NARRATIVE
// ============================================================================

function buildRecoveryNarrative(item: VelocityItem): NarrativeResult {
  const text = getTranscriptText(item);
  const signals = extractSignals(text);
  const warnings: Warning[] = [];

  const lead = item as Lead;
  const customerName = item.customer_name || 'Customer';

  // Get sentiment info
  const sentimentScore = lead.sentiment_score;
  const sentimentLabel = sentimentScore !== null && sentimentScore !== undefined
    ? sentimentScore <= 2 ? 'Upset customer'
      : sentimentScore === 3 ? 'Concerned customer'
        : 'Customer inquiry'
    : signals.sentimentKeywords.length > 0
      ? `${capitalizeFirst(signals.sentimentKeywords[0])} customer`
      : 'At-risk customer';

  // Get job context
  const priorityReason = lead.priority_reason;
  const issue = lead.issue_description;

  // Calculate days since created (approximation for "days since last visit")
  const daysSinceCreated = differenceInDays(new Date(), new Date(item.created_at));

  // Get customer quote
  const quote = signals.customerQuotes[0];

  // Check for recall risk (recent job)
  if (daysSinceCreated <= 30) {
    warnings.push({
      type: 'icon',
      field: 'recall',
      message: 'Recall Risk',
      icon: 'AlertCircle',
    });
  }

  // Check for high churn risk
  if (sentimentScore !== null && sentimentScore <= 2) {
    warnings.push({
      type: 'flash',
      field: 'sentiment',
      message: 'High Churn Risk',
    });
  }

  // FULL template: Has sentiment + reason
  if (priorityReason || signals.sentimentKeywords.length > 0) {
    let headline = `${sentimentLabel} regarding ${priorityReason || issue || 'previous service'}.`;

    if (quote) {
      headline += ` Quote: "${truncate(quote, 40)}"`;
    }

    return {
      headline,
      subtext: `${daysSinceCreated} days ago`,
      warnings,
    };
  }

  // FALLBACK template: Missing specific context
  const sentimentDisplay = sentimentScore !== null ? `Sentiment: ${sentimentScore}/5` : 'Low sentiment detected';

  return {
    headline: `At-Risk Customer detected. ${sentimentDisplay}.`,
    subtext: priorityReason ? `Reason: ${truncate(priorityReason, 40)}` : undefined,
    warnings,
  };
}

// ============================================================================
// LOGISTICS NARRATIVE
// ============================================================================

function buildLogisticsNarrative(item: VelocityItem): NarrativeResult {
  const text = getTranscriptText(item);
  const signals = extractSignals(text);
  const warnings: Warning[] = [];

  const lead = item as Lead;
  const customerName = item.customer_name || 'Customer';

  // Get service type
  const serviceType = isLead(item)
    ? item.issue_description || item.service_type || 'Service'
    : (item as any).service_type || 'Service';

  // Get time preference
  const timePreference = lead.time_preference;

  // Get access info
  const accessNotes: string[] = [];
  if (signals.gateCode) accessNotes.push(`Gate: ${signals.gateCode}`);
  if (signals.petWarning) accessNotes.push(signals.petWarning);
  if (signals.keyLocation) accessNotes.push(signals.keyLocation);
  accessNotes.push(...signals.accessNotes);

  const accessInfo = accessNotes.length > 0 ? accessNotes[0] : null;

  // Add icons for access warnings
  if (signals.petWarning) {
    warnings.push({
      type: 'icon',
      field: 'pet',
      message: 'Pet on premises',
      icon: 'Dog',
    });
  }
  if (signals.gateCode) {
    warnings.push({
      type: 'icon',
      field: 'gate',
      message: 'Gate code required',
      icon: 'Key',
    });
  }
  if (signals.keyLocation) {
    warnings.push({
      type: 'icon',
      field: 'key',
      message: 'Key location noted',
      icon: 'KeyRound',
    });
  }

  // FULL template: Has service + time window + access
  if (serviceType && (timePreference || accessInfo)) {
    let headline = `${truncate(serviceType, 30)} requested`;

    if (timePreference) {
      headline += ` for ${timePreference}`;
    }
    headline += '.';

    if (accessInfo) {
      headline += ` Note: ${truncate(accessInfo, 35)}.`;
    }

    return {
      headline,
      subtext: item.customer_address ? getCity(item.customer_address) : undefined,
      warnings,
    };
  }

  // FALLBACK template: Basic info only
  const actionNeeded = isLead(item)
    ? item.status === 'callback_requested' ? 'Callback needed' : 'Follow-up needed'
    : 'Scheduling needed';

  return {
    headline: `General inquiry from ${customerName}. Action: ${actionNeeded}.`,
    subtext: serviceType ? `Topic: ${truncate(serviceType, 40)}` : undefined,
    warnings,
  };
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

/**
 * Build a smart narrative for a velocity card based on archetype.
 * Uses conditional Full → Fallback templates for robust output.
 */
export function buildNarrative(
  item: VelocityItem,
  archetype: VelocityArchetype
): NarrativeResult {
  switch (archetype) {
    case 'HAZARD':
      return buildHazardNarrative(item);
    case 'REVENUE':
      return buildRevenueNarrative(item);
    case 'RECOVERY':
      return buildRecoveryNarrative(item);
    case 'LOGISTICS':
    default:
      return buildLogisticsNarrative(item);
  }
}

// ============================================================================
// INLINE NARRATIVE (Contextual Typography)
// ============================================================================

export interface NarrativeSegment {
  text: string;
  emphasis: 'bold' | 'normal';
}

export interface InlineNarrative {
  segments: NarrativeSegment[];
  subtext: string;  // Small gray: location (city only)
}

// Helper to add segment
function seg(text: string, emphasis: 'bold' | 'normal'): NarrativeSegment {
  return { text, emphasis };
}

function buildHazardInline(item: VelocityItem): InlineNarrative {
  const lead = item as Lead;
  const segments: NarrativeSegment[] = [];

  // PRIMARY: Use ai_summary - it has rich context
  const summary = cleanSummary(item.ai_summary);

  if (summary && summary.length > 15) {
    // Use the cleaned summary directly as the narrative
    segments.push(seg(summary, 'bold'));
  } else {
    // FALLBACK: Build from issue_description + signals
    const text = getTranscriptText(item);
    const signals = extractSignals(text);
    const issue = lead.issue_description || lead.priority_reason || '';

    if (!isGarbageValue(issue)) {
      segments.push(seg(capitalizeFirst(issue), 'bold'));
    }

    // Add evacuation context if detected
    if (signals.evacuationNeeded) {
      segments.push(seg('Family evacuated.', 'normal'));
    } else if (signals.shutOffInfo) {
      segments.push(seg(capitalizeFirst(signals.shutOffInfo) + '.', 'normal'));
    }

    // Ultimate fallback
    if (segments.length === 0) {
      segments.push(seg('Safety emergency reported.', 'bold'));
      segments.push(seg('Immediate response needed.', 'normal'));
    }
  }

  const city = getCity(item.customer_address);
  return { segments, subtext: city ? `at ${city}` : '' };
}

function buildRevenueInline(item: VelocityItem): InlineNarrative {
  const lead = item as Lead;
  const segments: NarrativeSegment[] = [];

  // PRIMARY: Use ai_summary - it has rich context
  const summary = cleanSummary(item.ai_summary);

  if (summary && summary.length > 15) {
    // Use the cleaned summary directly
    segments.push(seg(summary, 'bold'));
  } else {
    // FALLBACK: Build from equipment age + issue
    const text = getTranscriptText(item);
    const signals = extractSignals(text);
    const age = signals.equipmentAge || (lead.equipment_age ? parseInt(lead.equipment_age, 10) : null);
    const system = signals.equipmentMake || signals.refrigerantType || '';
    const issue = lead.issue_description || '';

    if (age) {
      const systemLabel = system ? `${age}-year ${system}` : `${age}-year-old unit`;
      segments.push(seg(systemLabel, 'bold'));
      if (!isGarbageValue(issue)) {
        segments.push(seg('—', 'normal'));
        segments.push(seg(truncate(issue, 40), 'normal'));
      }
    } else if (!isGarbageValue(issue)) {
      segments.push(seg(capitalizeFirst(truncate(issue, 50)), 'bold'));
    } else {
      // Ultimate fallback
      segments.push(seg('High-value service opportunity.', 'bold'));
    }

    // Add interest signals if not already in summary
    if (signals.financingMentioned) {
      segments.push(seg('Interested in financing.', 'normal'));
    } else if (signals.replacementMentioned) {
      segments.push(seg('Considering replacement.', 'normal'));
    }
  }

  const city = getCity(item.customer_address);
  return { segments, subtext: city ? `at ${city}` : '' };
}

function buildRecoveryInline(item: VelocityItem): InlineNarrative {
  const lead = item as Lead;
  const segments: NarrativeSegment[] = [];

  // PRIMARY: Use ai_summary - it has rich context
  const summary = cleanSummary(item.ai_summary);

  if (summary && summary.length > 15) {
    // Use the cleaned summary directly
    segments.push(seg(summary, 'bold'));
  } else {
    // FALLBACK: Build from sentiment + priority_reason
    const text = getTranscriptText(item);
    const signals = extractSignals(text);
    const sentimentScore = lead.sentiment_score;
    const issue = lead.priority_reason || lead.issue_description || '';

    // Determine sentiment label
    const sentimentLabel = sentimentScore !== null && sentimentScore !== undefined
      ? sentimentScore <= 2 ? 'Upset customer'
        : sentimentScore === 3 ? 'Concerned customer'
          : 'Customer following up'
      : signals.sentimentKeywords.length > 0
        ? capitalizeFirst(signals.sentimentKeywords[0]) + ' customer'
        : 'At-risk customer';

    segments.push(seg(sentimentLabel, 'bold'));

    if (!isGarbageValue(issue)) {
      segments.push(seg('—', 'normal'));
      segments.push(seg(truncate(issue, 45), 'normal'));
    } else {
      segments.push(seg('regarding previous service.', 'normal'));
    }

    // Add quote if available
    const quote = signals.customerQuotes[0];
    if (quote) {
      segments.push(seg(`"${truncate(quote, 30)}"`, 'normal'));
    }
  }

  const city = getCity(item.customer_address);
  return { segments, subtext: city ? `at ${city}` : '' };
}

function buildLogisticsInline(item: VelocityItem): InlineNarrative {
  const lead = item as Lead;
  const segments: NarrativeSegment[] = [];

  // PRIMARY: Use ai_summary - it has rich context
  const summary = cleanSummary(item.ai_summary);

  if (summary && summary.length > 15) {
    // Use the cleaned summary directly
    segments.push(seg(summary, 'bold'));
  } else {
    // FALLBACK: Build from issue_description + time preference
    const text = getTranscriptText(item);
    const signals = extractSignals(text);
    const issue = lead.issue_description || '';
    const timePreference = lead.time_preference;

    if (!isGarbageValue(issue)) {
      segments.push(seg(capitalizeFirst(truncate(issue, 50)), 'bold'));
    } else {
      segments.push(seg('Service call requested.', 'bold'));
    }

    // Add time preference
    if (timePreference) {
      segments.push(seg('Preferred time:', 'normal'));
      segments.push(seg(timePreference, 'bold'));
    }

    // Add access notes
    if (signals.gateCode) {
      segments.push(seg('Gate:', 'normal'));
      segments.push(seg(signals.gateCode, 'bold'));
    }

    if (signals.petWarning) {
      segments.push(seg('Pet on site.', 'normal'));
    }
  }

  const city = getCity(item.customer_address);
  return { segments, subtext: city ? `at ${city}` : '' };
}

/**
 * Build an inline narrative with contextual typography.
 * Bold emphasis is applied to the most actionable/important info, which varies by context.
 */
export function buildInlineNarrative(
  item: VelocityItem,
  archetype: VelocityArchetype
): InlineNarrative {
  switch (archetype) {
    case 'HAZARD':
      return buildHazardInline(item);
    case 'REVENUE':
      return buildRevenueInline(item);
    case 'RECOVERY':
      return buildRecoveryInline(item);
    case 'LOGISTICS':
    default:
      return buildLogisticsInline(item);
  }
}

/**
 * Get the appropriate expanded section label for an archetype.
 */
export function getExpandedLabel(archetype: VelocityArchetype): string {
  switch (archetype) {
    case 'HAZARD':
      return 'Safety Brief';
    case 'REVENUE':
      return 'Equipment Profile';
    case 'RECOVERY':
      return 'Timeline & Sentiment';
    case 'LOGISTICS':
      return 'Site Access';
    default:
      return 'Details';
  }
}

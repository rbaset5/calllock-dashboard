/**
 * HVAC Smart Tag Taxonomy Mapper
 *
 * Maps V2 backend taxonomy tags (117 tags across 9 categories)
 * to Velocity archetypes and display tags for the dashboard.
 */

import type { Lead, Job, VelocityArchetype } from '@/types/database';

// ============================================================================
// TAXONOMY CATEGORIES AND TAGS
// ============================================================================

export enum TaxonomyCategory {
  HAZARD = 'HAZARD',
  URGENCY = 'URGENCY',
  SERVICE_TYPE = 'SERVICE_TYPE',
  REVENUE = 'REVENUE',
  RECOVERY = 'RECOVERY',
  LOGISTICS = 'LOGISTICS',
  CUSTOMER = 'CUSTOMER',
  NON_CUSTOMER = 'NON_CUSTOMER',
  CONTEXT = 'CONTEXT',
}

export type TaxonomyTags = {
  [key in TaxonomyCategory]?: string[];
};

// ============================================================================
// ARCHETYPE MAPPING
// ============================================================================

/**
 * Determine velocity archetype from taxonomy tags.
 * Higher priority archetypes override lower ones.
 *
 * Precedence: HAZARD > RECOVERY > REVENUE > LOGISTICS
 */
export function mapTagsToArchetype(tags: TaxonomyTags | null): VelocityArchetype {
  if (!tags) return 'LOGISTICS';

  // HAZARD: Any hazard tag present
  if (hasAnyTag(tags, TaxonomyCategory.HAZARD)) {
    return 'HAZARD';
  }

  // RECOVERY: Callback risk, complaint, escalation, review threat
  const recoveryTags = tags[TaxonomyCategory.RECOVERY] || [];
  const highRecoveryTags = [
    'CALLBACK_RISK',
    'REPEAT_ISSUE',
    'WARRANTY_DISPUTE',
    'COMPLAINT_SERVICE',
    'COMPLAINT_TECH',
    'COMPLAINT_PRICE',
    'ESCALATION_REQ',
    'REVIEW_THREAT',
    'LEGAL_MENTION',
    'MISSED_APPT',
  ];
  if (recoveryTags.some(tag => highRecoveryTags.includes(tag))) {
    return 'RECOVERY';
  }

  // REVENUE: Hot lead, financing, replacement, commercial, multi-property
  const revenueTags = tags[TaxonomyCategory.REVENUE] || [];
  const highRevenueTags = [
    'HOT_LEAD',
    'R22_RETROFIT',
    'REPLACE_OPP',
    'COMMERCIAL_LEAD',
    'MULTI_PROPERTY',
  ];
  if (revenueTags.some(tag => highRevenueTags.includes(tag))) {
    return 'REVENUE';
  }

  return 'LOGISTICS';
}

// ============================================================================
// DISPLAY TAG MAPPING
// ============================================================================

export interface DisplayTag {
  label: string;
  variant: 'red' | 'amber' | 'green' | 'blue' | 'purple' | 'slate' | 'gray';
  icon?: string;
}

/**
 * Map taxonomy tags to display tags for velocity cards.
 * Returns up to 4 tags sorted by priority.
 */
export function mapToDisplayTags(
  item: Lead | Job,
  archetype: VelocityArchetype
): DisplayTag[] {
  const tags = item.tags as TaxonomyTags | null;
  if (!tags) return [];

  let displayTags: DisplayTag[] = [];

  switch (archetype) {
    case 'HAZARD':
      displayTags = mapHazardTags(tags);
      break;
    case 'RECOVERY':
      displayTags = mapRecoveryTags(tags);
      break;
    case 'REVENUE':
      displayTags = mapRevenueTags(tags);
      break;
    case 'LOGISTICS':
      displayTags = mapLogisticsTags(tags);
      break;
  }

  // Add service type tag if available
  const serviceTags = tags[TaxonomyCategory.SERVICE_TYPE] || [];
  if (serviceTags.length > 0 && displayTags.length < 4) {
    displayTags.push(mapServiceTypeTag(serviceTags[0]));
  }

  return displayTags.slice(0, 4);
}

// HAZARD tag mappings
function mapHazardTags(tags: TaxonomyTags): DisplayTag[] {
  const result: DisplayTag[] = [];
  const hazardTags = tags[TaxonomyCategory.HAZARD] || [];

  for (const tag of hazardTags) {
    switch (tag) {
      case 'GAS_LEAK':
        result.push({ label: 'Gas Leak', variant: 'red', icon: 'AlertTriangle' });
        break;
      case 'CO_EVENT':
        result.push({ label: 'CO Risk', variant: 'red', icon: 'AlertTriangle' });
        break;
      case 'ELECTRICAL_FIRE':
        result.push({ label: 'Electrical', variant: 'amber' });
        break;
      case 'ACTIVE_FLOODING':
        result.push({ label: 'Flooding', variant: 'blue', icon: 'Droplets' });
        break;
      case 'REFRIGERANT_LEAK':
        result.push({ label: 'Refrigerant', variant: 'amber' });
        break;
      case 'HEALTH_RISK':
        result.push({ label: 'Health Risk', variant: 'red', icon: 'Activity' });
        break;
    }
    if (result.length >= 4) break;
  }

  return result;
}

// RECOVERY tag mappings
function mapRecoveryTags(tags: TaxonomyTags): DisplayTag[] {
  const result: DisplayTag[] = [];
  const recoveryTags = tags[TaxonomyCategory.RECOVERY] || [];

  for (const tag of recoveryTags) {
    switch (tag) {
      case 'CALLBACK_RISK':
        result.push({ label: 'Callback Risk', variant: 'red', icon: 'AlertCircle' });
        break;
      case 'REPEAT_ISSUE':
        result.push({ label: 'Repeat Issue', variant: 'amber' });
        break;
      case 'COMPLAINT_SERVICE':
        result.push({ label: 'Service Issue', variant: 'red' });
        break;
      case 'COMPLAINT_TECH':
        result.push({ label: 'Tech Complaint', variant: 'red' });
        break;
      case 'COMPLAINT_PRICE':
        result.push({ label: 'Price Issue', variant: 'amber' });
        break;
      case 'ESCALATION_REQ':
        result.push({ label: 'Manager Needed', variant: 'red', icon: 'UserCog' });
        break;
      case 'REVIEW_THREAT':
        result.push({ label: 'Review Risk', variant: 'red', icon: 'AlertTriangle' });
        break;
      case 'MISSED_APPT':
        result.push({ label: 'Missed Appt', variant: 'red' });
        break;
    }
    if (result.length >= 4) break;
  }

  return result;
}

// REVENUE tag mappings
function mapRevenueTags(tags: TaxonomyTags): DisplayTag[] {
  const result: DisplayTag[] = [];
  const revenueTags = tags[TaxonomyCategory.REVENUE] || [];

  for (const tag of revenueTags) {
    switch (tag) {
      case 'R22_RETROFIT':
        result.push({ label: 'R-22 System', variant: 'amber' });
        break;
      case 'REPLACE_OPP':
        result.push({ label: 'Replacement', variant: 'amber' });
        break;
      case 'FINANCING_REQ':
        result.push({ label: 'Financing', variant: 'green', icon: 'CreditCard' });
        break;
      case 'COMMERCIAL_LEAD':
        result.push({ label: 'Commercial $$$', variant: 'green', icon: 'Building2' });
        break;
      case 'HOT_LEAD':
        result.push({ label: 'Hot Lead', variant: 'red', icon: 'Flame' });
        break;
      case 'MULTI_PROPERTY':
        result.push({ label: 'Multi-Prop', variant: 'green' });
        break;
      case 'QUOTE_REQUEST':
        result.push({ label: 'Quote Request', variant: 'blue' });
        break;
      case 'QUOTE_FOLLOWUP':
        result.push({ label: 'Quote Follow-up', variant: 'green' });
        break;
    }
    if (result.length >= 4) break;
  }

  return result;
}

// LOGISTICS tag mappings
function mapLogisticsTags(tags: TaxonomyTags): DisplayTag[] {
  const result: DisplayTag[] = [];
  const logisticsTags = tags[TaxonomyCategory.LOGISTICS] || [];

  for (const tag of logisticsTags) {
    switch (tag) {
      case 'GATE_CODE':
        result.push({ label: 'Gate Code', variant: 'blue', icon: 'Key' });
        break;
      case 'GUARD_GATE':
        result.push({ label: 'Guard Gate', variant: 'blue' });
        break;
      case 'LOCKBOX':
        result.push({ label: 'Lockbox', variant: 'slate' });
        break;
      case 'ALARM_CODE':
        result.push({ label: 'Alarm', variant: 'blue' });
        break;
      case 'EQUIP_ROOF':
        result.push({ label: 'Rooftop', variant: 'amber' });
        break;
      case 'EQUIP_ATTIC':
        result.push({ label: 'Attic', variant: 'amber' });
        break;
      case 'EQUIP_CRAWLSPACE':
        result.push({ label: 'Crawlspace', variant: 'amber' });
        break;
      case 'PET_SECURE':
        result.push({ label: 'Pet', variant: 'amber', icon: 'Dog' });
        break;
      case 'LANDLORD_AUTH':
        result.push({ label: 'Landlord Auth', variant: 'purple' });
        break;
      case 'NTE_LIMIT':
        result.push({ label: 'Spending Cap', variant: 'blue' });
        break;
      case 'SPANISH_PREF':
        result.push({ label: 'Español', variant: 'purple' });
        break;
    }
    if (result.length >= 4) break;
  }

  return result;
}

// Service type tag mapping
function mapServiceTypeTag(tag: string): DisplayTag {
  const serviceMap: Record<string, { label: string; variant: DisplayTag['variant'] }> = {
    REPAIR_AC: { label: 'AC Repair', variant: 'blue' },
    REPAIR_HEATING: { label: 'Heat Repair', variant: 'blue' },
    REPAIR_HEATPUMP: { label: 'Heat Pump', variant: 'blue' },
    REPAIR_THERMOSTAT: { label: 'Thermostat', variant: 'slate' },
    REPAIR_IAQ: { label: 'IAQ', variant: 'slate' },
    REPAIR_DUCTWORK: { label: 'Ductwork', variant: 'slate' },
    TUNEUP_AC: { label: 'AC Tune-up', variant: 'blue' },
    TUNEUP_HEATING: { label: 'Furnace Tune-up', variant: 'blue' },
    DUCT_CLEANING: { label: 'Duct Clean', variant: 'slate' },
    INSTALL_REPLACEMENT: { label: 'Replacement', variant: 'green' },
    INSTALL_NEWCONSTRUCTION: { label: 'New Construction', variant: 'green' },
    INSTALL_UPGRADE: { label: 'Upgrade', variant: 'green' },
    INSTALL_DUCTLESS: { label: 'Ductless', variant: 'blue' },
    INSTALL_THERMOSTAT: { label: 'Thermostat', variant: 'slate' },
    DIAG_NOISE: { label: 'Noise Issue', variant: 'amber' },
    DIAG_SMELL: { label: 'Smell Issue', variant: 'amber' },
    DIAG_PERFORMANCE: { label: 'Performance', variant: 'amber' },
    DIAG_HIGHBILL: { label: 'High Bill', variant: 'amber' },
  };

  const mapped = serviceMap[tag];
  return mapped || { label: tag.replace(/_/g, ' '), variant: 'blue' };
}

// ============================================================================
// URGENCY MAPPING
// ============================================================================

/**
 * Map urgency tags to standard urgency levels.
 */
export function mapUrgencyFromTags(tags: TaxonomyTags | null): 'emergency' | 'high' | 'medium' | 'low' {
  if (!tags) return 'medium';

  const urgencyTags = tags[TaxonomyCategory.URGENCY] || [];

  if (urgencyTags.includes('CRITICAL_EVACUATE') || urgencyTags.includes('CRITICAL_DISPATCH')) {
    return 'emergency';
  }
  if (urgencyTags.includes('EMERGENCY_SAMEDAY') || urgencyTags.includes('URGENT_24HR')) {
    return 'high';
  }
  if (urgencyTags.includes('PRIORITY_48HR')) {
    return 'medium';
  }
  if (urgencyTags.includes('STANDARD') || urgencyTags.includes('FLEXIBLE')) {
    return 'low';
  }

  return 'medium';
}

// ============================================================================
// HELPERS
// ============================================================================

function hasAnyTag(tags: TaxonomyTags, category: TaxonomyCategory): boolean {
  const categoryTags = tags[category];
  return Array.isArray(categoryTags) && categoryTags.length > 0;
}

/**
 * Check if item has a specific tag
 */
export function hasTag(item: Lead | Job, category: TaxonomyCategory, tagName: string): boolean {
  const tags = item.tags as TaxonomyTags | null;
  if (!tags) return false;

  const categoryTags = tags[category];
  return Array.isArray(categoryTags) && categoryTags.includes(tagName);
}

/**
 * Get all tags from a category
 */
export function getCategoryTags(item: Lead | Job, category: TaxonomyCategory): string[] {
  const tags = item.tags as TaxonomyTags | null;
  if (!tags) return [];

  return tags[category] || [];
}

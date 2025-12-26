/**
 * Signal Extraction Engine
 *
 * Extracts structured signals from AI summaries and call transcripts
 * for use in velocity card narratives, smart tags, and command grids.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ExtractedSignals {
  // Safety signals
  occupants: string[];          // ["baby", "elderly", "pet"]
  hazardType: string | null;    // "gas", "electrical", "water", "fire"
  shutOffInfo: string | null;   // "turned off gas main"
  evacuationNeeded: boolean;

  // Asset signals
  equipmentMake: string | null; // "Carrier", "Trane", "Lennox"
  equipmentAge: number | null;  // Years (parsed from "15 year old")
  refrigerantType: string | null; // "R-22", "R-410A"
  unitLocation: string | null;  // "attic", "basement", "garage"

  // Access signals
  gateCode: string | null;      // "1234", "#5678"
  petWarning: string | null;    // "large dog in yard"
  keyLocation: string | null;   // "under mat", "lockbox #1234"
  accessNotes: string[];        // ["steep stairs", "narrow hallway"]

  // Sentiment signals
  customerQuotes: string[];     // Direct quotes from transcript
  sentimentKeywords: string[];  // ["angry", "frustrated", "happy"]
  urgencyKeywords: string[];    // ["emergency", "asap", "urgent"]

  // Sales signals
  financingMentioned: boolean;
  replacementMentioned: boolean;
  competitorMentioned: string | null; // "They quoted me $X from ABC Company"

  // Service signals
  problemKeywords: string[];    // Key symptoms/issues
  previousAttempts: string | null; // "tried resetting the thermostat"

  // Legacy: urgency signals (for backward compatibility)
  urgencySignals: string[];
}

// ============================================================================
// EXTRACTION PATTERNS
// ============================================================================

const PATTERNS = {
  // Occupants
  occupants: /\b(baby|infant|toddler|newborn|child|kid|elderly|senior|pregnant|pet|dog|cat|disabled)\b/gi,

  // Hazard types
  hazardGas: /\b(gas\s*leak|smell(s)?\s*(like\s*)?(gas|rotten\s*eggs?)|natural\s*gas)\b/i,
  hazardElectrical: /\b(electric(al)?\s*(shock|sparks?|fire)|burning\s*smell|short(ing)?|arc(ing)?)\b/i,
  hazardWater: /\b(water\s*leak|flood(ing)?|burst\s*pipe|water\s*damage|sewage)\b/i,
  hazardFire: /\b(fire|smoke|burning|flames?)\b/i,
  hazardCO: /\b(carbon\s*monoxide|co\s*(detector|alarm)|headache.*dizzy|dizzy.*headache)\b/i,

  // Shut-off actions
  shutOff: /\b(turned?\s*off|shut\s*off|disconnected)\s*(the\s*)?(gas|water|power|breaker|main)\b/i,

  // Evacuation indicators
  evacuation: /\b(evacuate|leave\s*(the\s*)?house|get\s*out|left\s*(the\s*)?home)\b/i,

  // Equipment makes
  equipmentMake: /\b(carrier|trane|lennox|rheem|goodman|york|bryant|american\s*standard|daikin|mitsubishi|fujitsu|lg|samsung|bosch)\b/i,

  // Equipment age
  equipmentAge: /(\d{1,2})\s*(?:year|yr)s?\s*old/i,

  // Refrigerant types
  refrigerant: /\b(R-?22|R-?410\s*[aA]?|R-?32|puron|freon)\b/i,

  // Unit location
  unitLocation: /\b(in\s*(?:the\s*)?)?(attic|basement|garage|closet|crawl\s*space|utility\s*room|roof)\b/i,

  // Gate codes
  gateCode: /gate\s*(?:code|#)?[:\s]*([#*A-Z0-9]+)/i,

  // Pet warnings
  petWarning: /(large\s+dog|aggressive\s+(dog|pet)|dog\s+in\s+(the\s+)?yard|beware\s+of\s+dog|pet\s+warning|dogs?\s+will\s+bark)/i,

  // Key location
  keyLocation: /(key\s+(is\s+)?(under|in|at)\s+[^.]+|lockbox\s*[#\d]*)/i,

  // Access notes
  accessNotes: /(steep\s+stairs|narrow\s+hall(way)?|tight\s+space|hard\s+to\s+reach|difficult\s+access|ladder\s+needed)/gi,

  // Sentiment keywords
  sentimentNegative: /\b(angry|frustrated|upset|furious|annoyed|disappointed|unhappy|mad|livid)\b/gi,
  sentimentPositive: /\b(happy|pleased|satisfied|thankful|grateful|appreciate)\b/gi,

  // Urgency keywords
  urgencyHigh: /\b(emergency|urgent|asap|immediately|right\s+away|can't\s+wait|critical|desperate)\b/gi,

  // Financing
  financing: /\b(monthly\s+payment|finance|financing|payment\s+plan|afford|budget|credit)\b/i,

  // Replacement
  replacement: /\b(new\s+(?:system|unit)|replace(?:ment)?|upgrade|getting\s+old|need\s+new)\b/i,

  // Competitor mentions
  competitor: /(?:quoted?|estimate|price)\s+(?:from|by)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i,

  // Problem keywords
  problemKeywords: /\b(not\s+(?:working|cooling|heating)|won't\s+(?:start|turn\s+on)|making\s+noise|leaking|frozen|ice|weak\s+(?:air|flow)|short\s+cycling|running\s+constantly)\b/gi,

  // Previous attempts
  previousAttempts: /\b(?:tried|already)\s+([^.]+)/i,

  // Customer quotes (text in quotes)
  customerQuotes: /"([^"]+)"|'([^']+)'/g,
};

// ============================================================================
// MAIN EXTRACTION FUNCTION
// ============================================================================

/**
 * Extract all signals from text (AI summary or transcript).
 * Memoized results are cached for performance.
 */
export function extractSignals(text: string | undefined | null): ExtractedSignals {
  const result: ExtractedSignals = {
    occupants: [],
    hazardType: null,
    shutOffInfo: null,
    evacuationNeeded: false,
    equipmentMake: null,
    equipmentAge: null,
    refrigerantType: null,
    unitLocation: null,
    gateCode: null,
    petWarning: null,
    keyLocation: null,
    accessNotes: [],
    customerQuotes: [],
    sentimentKeywords: [],
    urgencyKeywords: [],
    financingMentioned: false,
    replacementMentioned: false,
    competitorMentioned: null,
    problemKeywords: [],
    previousAttempts: null,
    urgencySignals: [],
  };

  if (!text) return result;

  const normalizedText = text.toLowerCase();

  // Extract occupants
  const occupantMatches = text.match(PATTERNS.occupants);
  if (occupantMatches) {
    result.occupants = Array.from(new Set(occupantMatches.map(m => m.toLowerCase())));
  }

  // Determine hazard type (priority order)
  if (PATTERNS.hazardCO.test(text)) {
    result.hazardType = 'carbon_monoxide';
  } else if (PATTERNS.hazardGas.test(text)) {
    result.hazardType = 'gas';
  } else if (PATTERNS.hazardElectrical.test(text)) {
    result.hazardType = 'electrical';
  } else if (PATTERNS.hazardFire.test(text)) {
    result.hazardType = 'fire';
  } else if (PATTERNS.hazardWater.test(text)) {
    result.hazardType = 'water';
  }

  // Shut-off info
  const shutOffMatch = text.match(PATTERNS.shutOff);
  if (shutOffMatch) {
    result.shutOffInfo = shutOffMatch[0].trim();
  }

  // Evacuation needed
  result.evacuationNeeded = PATTERNS.evacuation.test(text) ||
    (result.hazardType === 'carbon_monoxide') ||
    (result.hazardType === 'gas' && /smell|dizzy|headache/i.test(text));

  // Equipment make
  const makeMatch = text.match(PATTERNS.equipmentMake);
  if (makeMatch) {
    result.equipmentMake = makeMatch[0].charAt(0).toUpperCase() + makeMatch[0].slice(1).toLowerCase();
  }

  // Equipment age
  const ageMatch = text.match(PATTERNS.equipmentAge);
  if (ageMatch) {
    result.equipmentAge = parseInt(ageMatch[1], 10);
  }

  // Refrigerant type
  const refrigerantMatch = text.match(PATTERNS.refrigerant);
  if (refrigerantMatch) {
    result.refrigerantType = refrigerantMatch[0].toUpperCase().replace(/\s+/g, '');
  }

  // Unit location
  const locationMatch = text.match(PATTERNS.unitLocation);
  if (locationMatch) {
    result.unitLocation = locationMatch[2]?.toLowerCase() || locationMatch[0].toLowerCase();
  }

  // Gate code
  const gateMatch = text.match(PATTERNS.gateCode);
  if (gateMatch) {
    result.gateCode = gateMatch[1];
  }

  // Pet warning
  const petMatch = text.match(PATTERNS.petWarning);
  if (petMatch) {
    result.petWarning = petMatch[0];
  }

  // Key location
  const keyMatch = text.match(PATTERNS.keyLocation);
  if (keyMatch) {
    result.keyLocation = keyMatch[0];
  }

  // Access notes
  const accessMatches = text.match(PATTERNS.accessNotes);
  if (accessMatches) {
    result.accessNotes = Array.from(new Set(accessMatches.map(m => m.toLowerCase())));
  }

  // Customer quotes
  let quoteMatch;
  const quoteRegex = /"([^"]+)"|'([^']+)'/g;
  while ((quoteMatch = quoteRegex.exec(text)) !== null) {
    const quote = quoteMatch[1] || quoteMatch[2];
    if (quote && quote.length > 5 && quote.length < 100) {
      result.customerQuotes.push(quote);
    }
  }

  // Sentiment keywords
  const negativeMatches = text.match(PATTERNS.sentimentNegative);
  const positiveMatches = text.match(PATTERNS.sentimentPositive);
  if (negativeMatches) {
    result.sentimentKeywords.push(...negativeMatches.map(m => m.toLowerCase()));
  }
  if (positiveMatches) {
    result.sentimentKeywords.push(...positiveMatches.map(m => m.toLowerCase()));
  }

  // Urgency keywords
  const urgencyMatches = text.match(PATTERNS.urgencyHigh);
  if (urgencyMatches) {
    result.urgencyKeywords = Array.from(new Set(urgencyMatches.map(m => m.toLowerCase())));
  }

  // Financing
  result.financingMentioned = PATTERNS.financing.test(text);

  // Replacement
  result.replacementMentioned = PATTERNS.replacement.test(text);

  // Competitor
  const competitorMatch = text.match(PATTERNS.competitor);
  if (competitorMatch) {
    result.competitorMentioned = competitorMatch[1];
  }

  // Problem keywords
  const problemMatches = text.match(PATTERNS.problemKeywords);
  if (problemMatches) {
    result.problemKeywords = Array.from(new Set(problemMatches.map(m => m.toLowerCase())));
  }

  // Previous attempts
  const attemptMatch = text.match(PATTERNS.previousAttempts);
  if (attemptMatch) {
    result.previousAttempts = attemptMatch[1].trim();
  }

  // Legacy: urgency signals (for backward compatibility)
  result.urgencySignals = extractUrgencySignals(text);

  return result;
}

// ============================================================================
// LEGACY FUNCTION (backward compatibility)
// ============================================================================

/**
 * Extract urgency signals from issue description text.
 * Used client-side to display on detail pages without storing in DB.
 * Returns array of detected signals for display as badges.
 *
 * @deprecated Use extractSignals() for comprehensive extraction
 */
export function extractUrgencySignals(text: string | undefined | null): string[] {
  if (!text) return [];

  const signals: string[] = [];
  const patterns = [
    { regex: /\b(gas\s*)?leak(ing)?\b/i, signal: 'Possible leak' },
    { regex: /\bno\s*(heat|cooling|air)\b/i, signal: 'No heat/cooling' },
    { regex: /\bemergency\b/i, signal: 'Emergency' },
    { regex: /\bdangerous\b|\bunsafe\b/i, signal: 'Safety concern' },
    { regex: /\bsmoke\b|\bburning\s*smell\b/i, signal: 'Smoke/burning' },
    { regex: /\bwater\s*damage\b|\bflooding\b/i, signal: 'Water damage' },
    { regex: /\belectric(al)?\s*(shock|sparks?)\b/i, signal: 'Electrical hazard' },
    { regex: /\bcarbon\s*monoxide\b|\bco\s*detector\b/i, signal: 'CO concern' },
    { regex: /\bfreez(ing|e)\b/i, signal: 'Freezing temps' },
    { regex: /\belderly\b|\bsenior\b|\b(baby|infant|newborn)\b/i, signal: 'Vulnerable occupant' },
  ];

  for (const { regex, signal } of patterns) {
    if (regex.test(text)) signals.push(signal);
  }
  return signals;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get a short hazard label for display.
 */
export function getHazardLabel(hazardType: string | null): string {
  switch (hazardType) {
    case 'carbon_monoxide': return 'CO Hazard';
    case 'gas': return 'Gas Leak';
    case 'electrical': return 'Electrical';
    case 'fire': return 'Fire Risk';
    case 'water': return 'Water Damage';
    default: return 'Hazard';
  }
}

/**
 * Determine if an equipment age is considered "old" (>12 years).
 */
export function isEquipmentOld(age: number | null): boolean {
  return age !== null && age > 12;
}

/**
 * Get refrigerant status (obsolete, current, or unknown).
 */
export function getRefrigerantStatus(type: string | null): 'obsolete' | 'current' | 'unknown' {
  if (!type) return 'unknown';
  const upper = type.toUpperCase();
  if (upper.includes('22') || upper === 'FREON') return 'obsolete';
  if (upper.includes('410') || upper === 'PURON') return 'current';
  if (upper.includes('32')) return 'current';
  return 'unknown';
}

/**
 * Extract the first relevant quote from transcript.
 */
export function getFirstQuote(signals: ExtractedSignals): string | null {
  if (signals.customerQuotes.length > 0) {
    return signals.customerQuotes[0];
  }
  return null;
}

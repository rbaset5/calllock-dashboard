/**
 * Revenue Signal Categorization Utilities
 *
 * Parses revenue_tier_signals arrays to identify critical signals
 * (R-22, Freon, obsolete refrigerant) that indicate high-value
 * replacement opportunities ($10k+).
 */

/** Keywords that indicate critical replacement opportunity signals */
const CRITICAL_SIGNAL_PATTERNS = [
  'r-22',
  'r22',
  'freon',
  'obsolete',
  'old refrigerant',
];

/**
 * Check if a signal is critical (indicates replacement opportunity)
 */
export function isCriticalSignal(signal: string): boolean {
  const lowerSignal = signal.toLowerCase();
  return CRITICAL_SIGNAL_PATTERNS.some((pattern) => lowerSignal.includes(pattern));
}

/**
 * Categorize signals into critical (highlighted) and normal groups
 * Critical signals are sorted first for display priority
 */
export function categorizeTierSignals(signals: string[] | null | undefined): {
  critical: string[];
  normal: string[];
} {
  if (!signals || signals.length === 0) {
    return { critical: [], normal: [] };
  }

  const critical: string[] = [];
  const normal: string[] = [];

  for (const signal of signals) {
    if (isCriticalSignal(signal)) {
      critical.push(signal);
    } else {
      normal.push(signal);
    }
  }

  return { critical, normal };
}

/**
 * Get signals ordered with critical first
 * Useful for "show first N" display patterns
 */
export function getOrderedSignals(signals: string[] | null | undefined): string[] {
  const { critical, normal } = categorizeTierSignals(signals);
  return [...critical, ...normal];
}

/**
 * Check if any critical signals exist in the array
 */
export function hasCriticalSignals(signals: string[] | null | undefined): boolean {
  if (!signals || signals.length === 0) return false;
  return signals.some(isCriticalSignal);
}

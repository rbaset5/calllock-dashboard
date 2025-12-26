import { format, addDays, startOfDay, isToday, isTomorrow, getHours } from 'date-fns';
import type { TimeSlot, TimeOfDay, TimePreference } from './types';

/**
 * Generate an array of dates starting from today
 */
export function generateDateRange(days: number = 7): Date[] {
  const today = startOfDay(new Date());
  return Array.from({ length: days }, (_, i) => addDays(today, i));
}

/**
 * Format a date for the date picker label
 */
export function formatDateLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEE');
}

/**
 * Format phone number as user types
 */
export function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

/**
 * Parse customer's time preference string into structured data
 */
export function parseTimePreference(preference: string | null | undefined): TimePreference {
  if (!preference) return { timeOfDay: null, specificDay: null, displayText: null };

  const lower = preference.toLowerCase();

  // Check for urgency/ASAP
  if (
    lower.includes('asap') ||
    lower.includes('soon') ||
    lower.includes('emergency') ||
    lower.includes('urgent') ||
    lower.includes('today') ||
    lower.includes('right away')
  ) {
    return { timeOfDay: 'asap', specificDay: 'today', displayText: preference };
  }

  // Check for time of day
  let timeOfDay: TimeOfDay = null;
  if (lower.includes('morning') || lower.includes('am')) {
    timeOfDay = 'morning';
  } else if (lower.includes('afternoon')) {
    timeOfDay = 'afternoon';
  } else if (lower.includes('evening') || lower.includes('pm') || lower.includes('after work')) {
    timeOfDay = 'evening';
  }

  // Check for specific day
  let specificDay: string | null = null;
  if (lower.includes('tomorrow')) {
    specificDay = 'tomorrow';
  } else if (lower.includes('monday')) {
    specificDay = 'monday';
  } else if (lower.includes('tuesday')) {
    specificDay = 'tuesday';
  } else if (lower.includes('wednesday')) {
    specificDay = 'wednesday';
  } else if (lower.includes('thursday')) {
    specificDay = 'thursday';
  } else if (lower.includes('friday')) {
    specificDay = 'friday';
  } else if (lower.includes('saturday')) {
    specificDay = 'saturday';
  } else if (lower.includes('sunday')) {
    specificDay = 'sunday';
  } else if (lower.includes('weekend')) {
    specificDay = 'weekend';
  }

  return { timeOfDay, specificDay, displayText: preference };
}

/**
 * Check if a time slot matches customer's time preference
 */
export function isSlotPreferred(
  slot: TimeSlot,
  preference: { timeOfDay: TimeOfDay }
): boolean {
  if (!preference.timeOfDay || preference.timeOfDay === 'asap') return false;

  const hour = getHours(new Date(slot.isoDateTime));

  switch (preference.timeOfDay) {
    case 'morning':
      return hour >= 7 && hour < 12;
    case 'afternoon':
      return hour >= 12 && hour < 17;
    case 'evening':
      return hour >= 17 && hour < 21;
    default:
      return false;
  }
}

/**
 * Sort slots by preference (preferred times first)
 */
export function sortSlotsByPreference(
  slots: TimeSlot[],
  preference: { timeOfDay: TimeOfDay }
): TimeSlot[] {
  if (!preference.timeOfDay) return slots;

  return [...slots].sort((a, b) => {
    const aPreferred = isSlotPreferred(a, preference);
    const bPreferred = isSlotPreferred(b, preference);

    if (aPreferred && !bPreferred) return -1;
    if (!aPreferred && bPreferred) return 1;
    return 0;
  });
}

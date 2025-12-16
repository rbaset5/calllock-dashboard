/**
 * SMS Time Parser (V4)
 *
 * Natural language time parsing for SMS-based booking.
 * Allows contractors to book appointments via text without opening the app.
 *
 * Supported formats:
 * - "TUE 2PM" / "TUE 2:00PM"
 * - "TOMORROW 9AM" / "TOMORROW MORNING"
 * - "TODAY 3PM" / "TODAY AFTERNOON"
 * - "MONDAY 10:30AM"
 * - "12/20 2PM" / "12-20 2PM"
 * - "NEXT WEEK" / "THIS FRIDAY"
 * - "MORNING" / "AFTERNOON" / "EVENING" (defaults to next available)
 */

import {
  addDays,
  addHours,
  setHours,
  setMinutes,
  startOfDay,
  nextDay,
  isToday,
  isBefore,
  parse,
  format,
} from 'date-fns';

// ============================================
// TYPES
// ============================================

export interface ParsedTime {
  success: boolean;
  dateTime?: Date;
  displayText?: string;
  error?: string;
  needsClarification?: boolean;
  clarificationPrompt?: string;
}

export interface TimePreset {
  label: string;
  getDateTime: () => Date;
}

// ============================================
// CONSTANTS
// ============================================

// Day name mappings
const DAY_NAMES: Record<string, number> = {
  SUN: 0,
  SUNDAY: 0,
  MON: 1,
  MONDAY: 1,
  TUE: 2,
  TUES: 2,
  TUESDAY: 2,
  WED: 3,
  WEDNESDAY: 3,
  THU: 4,
  THUR: 4,
  THURS: 4,
  THURSDAY: 4,
  FRI: 5,
  FRIDAY: 5,
  SAT: 6,
  SATURDAY: 6,
};

// Time of day defaults
const TIME_OF_DAY: Record<string, { hour: number; minute: number }> = {
  MORNING: { hour: 9, minute: 0 },
  AM: { hour: 9, minute: 0 },
  NOON: { hour: 12, minute: 0 },
  AFTERNOON: { hour: 14, minute: 0 },
  PM: { hour: 14, minute: 0 },
  EVENING: { hour: 17, minute: 0 },
  EOD: { hour: 17, minute: 0 },
};

// ============================================
// PARSING FUNCTIONS
// ============================================

/**
 * Parse a time string from SMS into a Date object
 */
export function parseTimeFromSMS(input: string): ParsedTime {
  const normalized = input.trim().toUpperCase();

  // Empty input
  if (!normalized) {
    return {
      success: false,
      needsClarification: true,
      clarificationPrompt: 'When? Reply with day & time (e.g., TUE 2PM, TOMORROW 9AM)',
    };
  }

  // Try various parsing strategies
  const result =
    tryParseRelativeDay(normalized) ||
    tryParseDayOfWeek(normalized) ||
    tryParseExplicitDate(normalized) ||
    tryParseTimeOnly(normalized) ||
    tryParsePreset(normalized);

  if (result) {
    // Validate the parsed time is in the future
    if (isBefore(result.dateTime!, new Date())) {
      // If it's today but the time has passed, suggest tomorrow
      if (isToday(result.dateTime!)) {
        const tomorrow = addDays(result.dateTime!, 1);
        return {
          success: true,
          dateTime: tomorrow,
          displayText: formatForConfirmation(tomorrow),
        };
      }
      return {
        success: false,
        error: 'That time has already passed',
        needsClarification: true,
        clarificationPrompt: 'That time has passed. Try a future date (e.g., TOMORROW 2PM)',
      };
    }
    return result;
  }

  // Couldn't parse
  return {
    success: false,
    needsClarification: true,
    clarificationPrompt: 'Couldn\'t understand that time. Try: TUE 2PM, TOMORROW 9AM, or MORNING',
  };
}

/**
 * Try to parse relative days: TODAY, TOMORROW
 */
function tryParseRelativeDay(input: string): ParsedTime | null {
  const today = startOfDay(new Date());

  // TODAY [time]
  if (input.startsWith('TODAY')) {
    const timeStr = input.replace('TODAY', '').trim();
    const time = parseTimeString(timeStr);
    if (time) {
      const dateTime = setHours(setMinutes(today, time.minute), time.hour);
      return {
        success: true,
        dateTime,
        displayText: formatForConfirmation(dateTime),
      };
    }
    // TODAY without time - need clarification
    return {
      success: false,
      needsClarification: true,
      clarificationPrompt: 'What time today? Reply with time (e.g., 2PM, 10:30AM)',
    };
  }

  // TOMORROW [time]
  if (input.startsWith('TOMORROW') || input.startsWith('TMRW') || input.startsWith('TMR')) {
    const tomorrow = addDays(today, 1);
    const timeStr = input.replace(/^(TOMORROW|TMRW|TMR)/, '').trim();
    const time = parseTimeString(timeStr);
    if (time) {
      const dateTime = setHours(setMinutes(tomorrow, time.minute), time.hour);
      return {
        success: true,
        dateTime,
        displayText: formatForConfirmation(dateTime),
      };
    }
    // TOMORROW without time - default to morning
    const dateTime = setHours(setMinutes(tomorrow, 0), 9);
    return {
      success: true,
      dateTime,
      displayText: formatForConfirmation(dateTime),
    };
  }

  return null;
}

/**
 * Try to parse day of week: MON, TUESDAY, etc.
 */
function tryParseDayOfWeek(input: string): ParsedTime | null {
  // Check for "NEXT [DAY]" pattern
  const nextMatch = input.match(/^NEXT\s+(\w+)/);
  if (nextMatch) {
    const dayName = nextMatch[1];
    if (DAY_NAMES[dayName] !== undefined) {
      const targetDay = DAY_NAMES[dayName];
      const targetDate = nextDay(new Date(), targetDay as 0 | 1 | 2 | 3 | 4 | 5 | 6);
      const nextWeekDate = addDays(targetDate, 7); // "NEXT Monday" = not this Monday

      const timeStr = input.replace(/^NEXT\s+\w+/, '').trim();
      const time = parseTimeString(timeStr) || { hour: 9, minute: 0 };
      const dateTime = setHours(setMinutes(startOfDay(nextWeekDate), time.minute), time.hour);

      return {
        success: true,
        dateTime,
        displayText: formatForConfirmation(dateTime),
      };
    }
  }

  // Check for "[DAY] [time]" pattern
  for (const [dayName, dayNum] of Object.entries(DAY_NAMES)) {
    if (input.startsWith(dayName)) {
      const targetDate = nextDay(new Date(), dayNum as 0 | 1 | 2 | 3 | 4 | 5 | 6);
      const timeStr = input.replace(dayName, '').trim();
      const time = parseTimeString(timeStr) || { hour: 9, minute: 0 };
      const dateTime = setHours(setMinutes(startOfDay(targetDate), time.minute), time.hour);

      return {
        success: true,
        dateTime,
        displayText: formatForConfirmation(dateTime),
      };
    }
  }

  return null;
}

/**
 * Try to parse explicit date: 12/20, 12-20, DEC 20
 */
function tryParseExplicitDate(input: string): ParsedTime | null {
  // MM/DD or MM-DD format
  const slashMatch = input.match(/^(\d{1,2})[\/\-](\d{1,2})\s*(.*)/);
  if (slashMatch) {
    const month = parseInt(slashMatch[1], 10) - 1; // 0-indexed
    const day = parseInt(slashMatch[2], 10);
    const timeStr = slashMatch[3]?.trim();

    const now = new Date();
    let year = now.getFullYear();

    // If the date has passed this year, assume next year
    const targetDate = new Date(year, month, day);
    if (isBefore(targetDate, startOfDay(now))) {
      year += 1;
    }

    const baseDate = new Date(year, month, day);
    const time = parseTimeString(timeStr) || { hour: 9, minute: 0 };
    const dateTime = setHours(setMinutes(baseDate, time.minute), time.hour);

    return {
      success: true,
      dateTime,
      displayText: formatForConfirmation(dateTime),
    };
  }

  return null;
}

/**
 * Try to parse time only: assumes today or tomorrow
 */
function tryParseTimeOnly(input: string): ParsedTime | null {
  const time = parseTimeString(input);
  if (time) {
    const today = startOfDay(new Date());
    let dateTime = setHours(setMinutes(today, time.minute), time.hour);

    // If the time has passed today, use tomorrow
    if (isBefore(dateTime, new Date())) {
      dateTime = addDays(dateTime, 1);
    }

    return {
      success: true,
      dateTime,
      displayText: formatForConfirmation(dateTime),
    };
  }
  return null;
}

/**
 * Try to parse presets: MORNING, AFTERNOON, ASAP, etc.
 */
function tryParsePreset(input: string): ParsedTime | null {
  // ASAP / NOW - next available (default to 1 hour from now)
  if (input === 'ASAP' || input === 'NOW' || input === 'SOON') {
    const dateTime = addHours(new Date(), 1);
    return {
      success: true,
      dateTime,
      displayText: formatForConfirmation(dateTime),
    };
  }

  // Time of day presets
  if (TIME_OF_DAY[input]) {
    const today = startOfDay(new Date());
    const { hour, minute } = TIME_OF_DAY[input];
    let dateTime = setHours(setMinutes(today, minute), hour);

    // If the time has passed today, use tomorrow
    if (isBefore(dateTime, new Date())) {
      dateTime = addDays(dateTime, 1);
    }

    return {
      success: true,
      dateTime,
      displayText: formatForConfirmation(dateTime),
    };
  }

  return null;
}

/**
 * Parse time string like "2PM", "2:30PM", "14:00", "10AM"
 */
function parseTimeString(input: string): { hour: number; minute: number } | null {
  if (!input) return null;

  const normalized = input.trim().toUpperCase();

  // Check for time of day keywords first
  if (TIME_OF_DAY[normalized]) {
    return TIME_OF_DAY[normalized];
  }

  // 12-hour format: 2PM, 2:30PM, 10:30AM
  const twelveHourMatch = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
  if (twelveHourMatch) {
    let hour = parseInt(twelveHourMatch[1], 10);
    const minute = parseInt(twelveHourMatch[2] || '0', 10);
    const period = twelveHourMatch[3];

    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;

    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return { hour, minute };
    }
  }

  // 24-hour format: 14:00, 9:30
  const twentyFourMatch = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourMatch) {
    const hour = parseInt(twentyFourMatch[1], 10);
    const minute = parseInt(twentyFourMatch[2], 10);

    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return { hour, minute };
    }
  }

  // Simple hour: "2" (assumes PM for business hours)
  const simpleMatch = normalized.match(/^(\d{1,2})$/);
  if (simpleMatch) {
    let hour = parseInt(simpleMatch[1], 10);
    // Assume PM for hours 1-6, AM for 7-11
    if (hour >= 1 && hour <= 6) hour += 12;
    if (hour >= 0 && hour <= 23) {
      return { hour, minute: 0 };
    }
  }

  return null;
}

/**
 * Format date for SMS confirmation
 */
function formatForConfirmation(date: Date): string {
  if (isToday(date)) {
    return `Today at ${format(date, 'h:mm a')}`;
  }
  return format(date, "EEE, MMM d 'at' h:mm a");
}

// ============================================
// SNOOZE TIME PARSING
// ============================================

export interface ParsedSnooze {
  success: boolean;
  snoozeUntil?: Date;
  displayText?: string;
  error?: string;
}

/**
 * Parse snooze duration from SMS
 * Supported: 1H, 2H, 3H, 30M, TOMORROW, TOMORROW AM, TOMORROW PM
 */
export function parseSnoozeFromSMS(input: string): ParsedSnooze {
  const normalized = input.trim().toUpperCase();

  // Hours: 1H, 2H, 3H, etc.
  const hourMatch = normalized.match(/^(\d+)\s*H(?:OUR)?S?$/);
  if (hourMatch) {
    const hours = parseInt(hourMatch[1], 10);
    if (hours >= 1 && hours <= 24) {
      const snoozeUntil = addHours(new Date(), hours);
      return {
        success: true,
        snoozeUntil,
        displayText: `${hours} hour${hours > 1 ? 's' : ''}`,
      };
    }
  }

  // Minutes: 30M, 15M, etc.
  const minMatch = normalized.match(/^(\d+)\s*M(?:IN)?(?:UTE)?S?$/);
  if (minMatch) {
    const minutes = parseInt(minMatch[1], 10);
    if (minutes >= 15 && minutes <= 120) {
      const snoozeUntil = new Date(Date.now() + minutes * 60 * 1000);
      return {
        success: true,
        snoozeUntil,
        displayText: `${minutes} minutes`,
      };
    }
  }

  // TOMORROW variants
  if (normalized === 'TOMORROW' || normalized === 'TMRW' || normalized === 'TMR') {
    const tomorrow = addDays(startOfDay(new Date()), 1);
    const snoozeUntil = setHours(setMinutes(tomorrow, 0), 9); // 9 AM
    return {
      success: true,
      snoozeUntil,
      displayText: 'Tomorrow at 9 AM',
    };
  }

  if (normalized === 'TOMORROW AM' || normalized === 'TMRW AM') {
    const tomorrow = addDays(startOfDay(new Date()), 1);
    const snoozeUntil = setHours(setMinutes(tomorrow, 0), 9);
    return {
      success: true,
      snoozeUntil,
      displayText: 'Tomorrow at 9 AM',
    };
  }

  if (normalized === 'TOMORROW PM' || normalized === 'TMRW PM') {
    const tomorrow = addDays(startOfDay(new Date()), 1);
    const snoozeUntil = setHours(setMinutes(tomorrow, 0), 14); // 2 PM
    return {
      success: true,
      snoozeUntil,
      displayText: 'Tomorrow at 2 PM',
    };
  }

  // Shorthand: 1, 2, 3 = hours
  const shortMatch = normalized.match(/^(\d)$/);
  if (shortMatch) {
    const hours = parseInt(shortMatch[1], 10);
    if (hours >= 1 && hours <= 9) {
      const snoozeUntil = addHours(new Date(), hours);
      return {
        success: true,
        snoozeUntil,
        displayText: `${hours} hour${hours > 1 ? 's' : ''}`,
      };
    }
  }

  return {
    success: false,
    error: 'Invalid snooze format. Try: 1H, 3H, 30M, TOMORROW, TOMORROW AM',
  };
}

// ============================================
// BOOKING CONFIRMATION
// ============================================

/**
 * Generate confirmation message for SMS booking
 */
export function generateBookingConfirmation(
  customerName: string,
  dateTime: Date
): string {
  const displayTime = formatForConfirmation(dateTime);
  return `Booked: ${customerName}\n${displayTime}\nAdded to your calendar`;
}

/**
 * Generate snooze confirmation message
 */
export function generateSnoozeConfirmation(
  customerName: string,
  snoozeUntil: Date
): string {
  const displayTime = formatForConfirmation(snoozeUntil);
  return `Snoozed: ${customerName}\nReminder: ${displayTime}`;
}

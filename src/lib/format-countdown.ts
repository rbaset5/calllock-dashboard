import { differenceInHours, differenceInMinutes, differenceInDays, isToday, isTomorrow } from 'date-fns';
import { toZonedTime, format as formatTz } from 'date-fns-tz';

/**
 * Format a future date as a countdown string
 * Examples: "in 18 hours", "in 2 hours", "in 45 minutes", "Tomorrow at 9:00 AM"
 */
export function formatCountdown(
  date: string | Date | null,
  timezone: string = 'America/New_York'
): string | null {
  if (!date) return null;

  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const zonedDate = toZonedTime(d, timezone);
  const zonedNow = toZonedTime(now, timezone);

  // If in the past, return null (or could return "past due")
  if (d < now) {
    return 'past due';
  }

  const minutesDiff = differenceInMinutes(d, now);
  const hoursDiff = differenceInHours(d, now);
  const daysDiff = differenceInDays(zonedDate, zonedNow);

  // Less than 1 hour: show minutes
  if (minutesDiff < 60) {
    if (minutesDiff <= 1) return 'in 1 minute';
    return `in ${minutesDiff} minutes`;
  }

  // Less than 24 hours: show hours
  if (hoursDiff < 24) {
    if (hoursDiff === 1) return 'in 1 hour';
    return `in ${hoursDiff} hours`;
  }

  // Tomorrow: show "Tomorrow at TIME"
  if (isTomorrow(zonedDate)) {
    const time = formatTz(zonedDate, 'h:mm a', { timeZone: timezone });
    return `Tomorrow at ${time}`;
  }

  // Within a week: show "DAY at TIME"
  if (daysDiff <= 7) {
    return formatTz(zonedDate, "EEEE 'at' h:mm a", { timeZone: timezone });
  }

  // Beyond a week: show "in X days"
  return `in ${daysDiff} days`;
}

/**
 * Get countdown urgency level for styling
 * Returns: 'imminent' (<2 hours), 'soon' (<24 hours), 'scheduled' (>24 hours), 'overdue' (past)
 */
export function getCountdownUrgency(
  date: string | Date | null
): 'imminent' | 'soon' | 'scheduled' | 'overdue' | null {
  if (!date) return null;

  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();

  if (d < now) return 'overdue';

  const hoursDiff = differenceInHours(d, now);

  if (hoursDiff < 2) return 'imminent';
  if (hoursDiff < 24) return 'soon';
  return 'scheduled';
}

/**
 * Format countdown as a compact badge string
 * Examples: "2h", "45m", "Tomorrow", "Mon 9am"
 */
export function formatCountdownCompact(
  date: string | Date | null,
  timezone: string = 'America/New_York'
): string | null {
  if (!date) return null;

  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const zonedDate = toZonedTime(d, timezone);
  const zonedNow = toZonedTime(now, timezone);

  if (d < now) return 'Overdue';

  const minutesDiff = differenceInMinutes(d, now);
  const hoursDiff = differenceInHours(d, now);
  const daysDiff = differenceInDays(zonedDate, zonedNow);

  // Less than 1 hour
  if (minutesDiff < 60) {
    return `${minutesDiff}m`;
  }

  // Less than 24 hours
  if (hoursDiff < 24) {
    return `${hoursDiff}h`;
  }

  // Tomorrow
  if (isTomorrow(zonedDate)) {
    return 'Tomorrow';
  }

  // Within a week
  if (daysDiff <= 7) {
    return formatTz(zonedDate, 'EEE', { timeZone: timezone });
  }

  // Beyond a week
  return `${daysDiff}d`;
}

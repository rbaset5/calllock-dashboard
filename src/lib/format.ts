import { format, formatDistanceToNow, isToday, isTomorrow, isYesterday } from 'date-fns';
import { toZonedTime, format as formatTz } from 'date-fns-tz';

// Format date/time in user's timezone
export function formatDateTime(
  date: string | Date,
  timezone: string = 'America/New_York'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const zonedDate = toZonedTime(d, timezone);
  return formatTz(zonedDate, 'MMM d, yyyy h:mm a', { timeZone: timezone });
}

// Format just the date
export function formatDate(
  date: string | Date,
  timezone: string = 'America/New_York'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const zonedDate = toZonedTime(d, timezone);
  return formatTz(zonedDate, 'MMM d, yyyy', { timeZone: timezone });
}

// Format just the time
export function formatTime(
  date: string | Date,
  timezone: string = 'America/New_York'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const zonedDate = toZonedTime(d, timezone);
  return formatTz(zonedDate, 'h:mm a', { timeZone: timezone });
}

// Format for schedule display (Today at 2:00 PM, Tomorrow at 3:00 PM, etc.)
export function formatScheduleTime(
  date: string | Date,
  timezone: string = 'America/New_York'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const zonedDate = toZonedTime(d, timezone);
  const time = formatTz(zonedDate, 'h:mm a', { timeZone: timezone });

  if (isToday(zonedDate)) {
    return `Today at ${time}`;
  }
  if (isTomorrow(zonedDate)) {
    return `Tomorrow at ${time}`;
  }
  if (isYesterday(zonedDate)) {
    return `Yesterday at ${time}`;
  }

  return formatTz(zonedDate, 'EEE, MMM d \'at\' h:mm a', { timeZone: timezone });
}

// Format relative time (2 hours ago, 3 days ago, etc.)
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format currency with cents
export function formatCurrencyPrecise(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

// Check if date is in the past
export function isPast(date: string | Date): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d < new Date();
}

// Check if date is within the next hour
export function isWithinNextHour(date: string | Date): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
  return d >= now && d <= oneHourFromNow;
}

// Get start of today in a timezone
export function getStartOfToday(timezone: string = 'America/New_York'): Date {
  const now = new Date();
  const zonedNow = toZonedTime(now, timezone);
  zonedNow.setHours(0, 0, 0, 0);
  return zonedNow;
}

// Get end of today in a timezone
export function getEndOfToday(timezone: string = 'America/New_York'): Date {
  const now = new Date();
  const zonedNow = toZonedTime(now, timezone);
  zonedNow.setHours(23, 59, 59, 999);
  return zonedNow;
}

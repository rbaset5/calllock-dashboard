/**
 * CallLock Notification Tiers (V4)
 *
 * SMS notification tier system that determines delivery behavior
 * based on message urgency and user preferences.
 *
 * Tiers:
 * - URGENT: Immediate delivery, bypasses quiet hours (callback risk, commercial)
 * - STANDARD: May batch within 5 min window, respects quiet hours (new leads)
 * - REMINDER: Scheduled delivery, respects quiet hours (follow-ups)
 * - BOOKED: Confirmation messages, respects quiet hours
 * - DIGEST: Daily summary, never sent during quiet hours
 */

import { PriorityColor } from '@/types/database';

// ============================================
// TYPES
// ============================================

export type NotificationTier = 'URGENT' | 'STANDARD' | 'REMINDER' | 'BOOKED' | 'DIGEST';

export interface TierBehavior {
  tier: NotificationTier;
  bypassQuietHours: boolean;
  maxBatchWindow: number; // seconds, 0 = immediate
  retryAttempts: number;
  retryDelaySeconds: number[];
  escalateAfterMinutes: number | null; // null = no escalation
}

export interface NotificationContext {
  eventType: string;
  priorityColor?: PriorityColor;
  isEmergency?: boolean;
  isCommercial?: boolean;
  isRepeatCaller?: boolean;
  estimatedValue?: number;
  callEndReason?: string;
}

// ============================================
// TIER CONFIGURATION
// ============================================

export const TIER_CONFIG: Record<NotificationTier, TierBehavior> = {
  URGENT: {
    tier: 'URGENT',
    bypassQuietHours: true,
    maxBatchWindow: 0, // Immediate
    retryAttempts: 3,
    retryDelaySeconds: [1, 5, 30], // Exponential backoff
    escalateAfterMinutes: null, // Already urgent
  },
  STANDARD: {
    tier: 'STANDARD',
    bypassQuietHours: false,
    maxBatchWindow: 300, // 5 minutes
    retryAttempts: 3,
    retryDelaySeconds: [5, 30, 120],
    escalateAfterMinutes: 120, // Escalate after 2 hours no action
  },
  REMINDER: {
    tier: 'REMINDER',
    bypassQuietHours: false,
    maxBatchWindow: 600, // 10 minutes
    retryAttempts: 2,
    retryDelaySeconds: [30, 300],
    escalateAfterMinutes: null,
  },
  BOOKED: {
    tier: 'BOOKED',
    bypassQuietHours: false,
    maxBatchWindow: 0, // Immediate (confirmations are time-sensitive)
    retryAttempts: 3,
    retryDelaySeconds: [5, 30, 120],
    escalateAfterMinutes: null,
  },
  DIGEST: {
    tier: 'DIGEST',
    bypassQuietHours: false,
    maxBatchWindow: 3600, // 1 hour
    retryAttempts: 1,
    retryDelaySeconds: [300],
    escalateAfterMinutes: null,
  },
};

// ============================================
// TIER DETERMINATION
// ============================================

/**
 * Determine notification tier based on event context
 */
export function determineNotificationTier(context: NotificationContext): NotificationTier {
  const {
    eventType,
    priorityColor,
    isEmergency,
    isCommercial,
    isRepeatCaller,
    estimatedValue,
    callEndReason,
  } = context;

  // URGENT tier conditions
  if (isEmergency) return 'URGENT';
  if (priorityColor === 'red') return 'URGENT'; // Callback risk
  if (priorityColor === 'green') return 'URGENT'; // Commercial/high-value
  if (isCommercial) return 'URGENT';
  if (isRepeatCaller && callEndReason === 'customer_hangup') return 'URGENT';
  if (estimatedValue && estimatedValue >= 1000) return 'URGENT';
  if (eventType === 'abandoned_call') return 'URGENT';
  if (eventType === 'emergency_alert') return 'URGENT';

  // BOOKED tier
  if (eventType === 'same_day_booking') return 'BOOKED';
  if (eventType === 'future_booking') return 'BOOKED';
  if (eventType === 'booking_confirmation') return 'BOOKED';

  // REMINDER tier
  if (eventType === 'reminder') return 'REMINDER';
  if (eventType === 'follow_up') return 'REMINDER';
  if (eventType === 'snooze_expired') return 'REMINDER';

  // DIGEST tier
  if (eventType === 'daily_digest') return 'DIGEST';
  if (eventType === 'weekly_summary') return 'DIGEST';

  // Default to STANDARD for new leads
  return 'STANDARD';
}

/**
 * Get tier behavior configuration
 */
export function getTierBehavior(tier: NotificationTier): TierBehavior {
  return TIER_CONFIG[tier];
}

/**
 * Check if notification should bypass quiet hours
 */
export function shouldBypassQuietHours(context: NotificationContext): boolean {
  const tier = determineNotificationTier(context);
  return TIER_CONFIG[tier].bypassQuietHours;
}

/**
 * Get batch window for notification
 */
export function getBatchWindow(context: NotificationContext): number {
  const tier = determineNotificationTier(context);
  return TIER_CONFIG[tier].maxBatchWindow;
}

// ============================================
// V4 MESSAGE TEMPLATES BY TIER
// ============================================

export const V4_TEMPLATES = {
  // URGENT - Callback Risk (RED)
  callbackRisk: (name: string, phone: string, reason: string) =>
    `CALLLOCK URGENT\n🔴 ${name}\n${phone}\n${reason}\nCall back NOW`,

  // URGENT - Commercial Lead (GREEN)
  commercialLead: (name: string, phone: string, value?: string) =>
    `CALLLOCK PRIORITY\n🟢 Commercial: ${name}\n${phone}${value ? `\nEst: ${value}` : ''}\nCall back ASAP`,

  // STANDARD - New Residential Lead (BLUE)
  newLead: (name: string, phone: string, issue: string) =>
    `CALLLOCK: New lead\n${name} · ${phone}\n"${issue.substring(0, 50)}${issue.length > 50 ? '...' : ''}"\nReply 1=Called 4=Booked`,

  // STANDARD - Spam/Vendor (GRAY) - typically not sent, but template exists
  spamVendor: (name: string, reason: string) =>
    `CALLLOCK: Likely spam\n${name}\n${reason}\nMarked as vendor call`,

  // BOOKED - Booking Confirmation
  bookingConfirm: (name: string, date: string, time: string) =>
    `CALLLOCK: Booked!\n${name}\n${date} at ${time}\nAdded to calendar`,

  // BOOKED - Same Day Booking
  sameDayBooking: (name: string, time: string, service: string) =>
    `CALLLOCK: TODAY\n${name} · ${time}\n${service}\nReply OK to confirm`,

  // REMINDER - Follow Up
  followUp: (name: string, lastContact: string) =>
    `CALLLOCK: Follow up\n${name}\nLast contact: ${lastContact}\nReply 1=Called 5=Lost`,

  // REMINDER - Snooze Expired
  snoozeExpired: (name: string, phone: string) =>
    `CALLLOCK: Reminder\n${name} · ${phone}\nSnooze ended\nReply 1=Called 4=Booked`,

  // DIGEST - Daily Summary
  dailyDigest: (stats: { total: number; urgent: number; booked: number }) =>
    `CALLLOCK Daily:\n${stats.total} leads today\n${stats.urgent} need callback\n${stats.booked} booked\nOpen app for details`,

  // DIGEST - Weekly Summary
  weeklySummary: (stats: { leads: number; converted: number; revenue: string }) =>
    `CALLLOCK Weekly:\n${stats.leads} leads\n${stats.converted} converted (${Math.round((stats.converted / stats.leads) * 100)}%)\nEst. ${stats.revenue}\nGreat work!`,
};

// ============================================
// DEEP LINK HELPERS
// ============================================

const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.calllock.ai';

export function generateDeepLink(type: 'lead' | 'job' | 'action', id?: string): string {
  switch (type) {
    case 'lead':
      return id ? `${APP_BASE_URL}/leads/${id}` : `${APP_BASE_URL}/action`;
    case 'job':
      return id ? `${APP_BASE_URL}/jobs/${id}` : `${APP_BASE_URL}/booked`;
    case 'action':
      return `${APP_BASE_URL}/action`;
    default:
      return APP_BASE_URL;
  }
}

/**
 * Format phone number as tel: link for SMS
 */
export function formatPhoneLink(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `tel:${digits}`;
}

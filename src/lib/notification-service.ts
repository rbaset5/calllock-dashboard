/**
 * CallLock Notification Service
 *
 * Central service for handling operator SMS notifications.
 * Respects user preferences, quiet hours, and STOP compliance.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { sendSMS, notificationTemplates } from '@/lib/twilio';
import { toZonedTime, format as formatTz } from 'date-fns-tz';
import { isToday as dateFnsIsToday, startOfDay, addDays, parseISO } from 'date-fns';

// ============================================
// TYPES
// ============================================

export type NotificationEventType =
  | 'same_day_booking'
  | 'future_booking'
  | 'callback_request'
  | 'schedule_conflict'
  | 'cancellation'
  | 'abandoned_call'
  | 'stale_job_alert';

export interface NotificationData {
  customerName: string;
  customerPhone?: string;
  scheduledAt?: string;
  serviceType?: string;
  address?: string;
  callbackTimeframe?: string;
  conflictingJobName?: string;
  conflictingJobTime?: string;
  // For stale job alerts
  hoursWaiting?: number;
}

export interface NotificationPreferences {
  sms_same_day_booking: boolean;
  sms_future_booking: boolean;
  sms_callback_request: boolean;
  sms_schedule_conflict: boolean;
  sms_cancellation: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  sms_unsubscribed: boolean;
}

export interface SendResult {
  sent: boolean;
  queued: boolean;
  reason?: string;
  twilioSid?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Extract city from address (last part before state/zip)
 */
function extractCity(address: string | undefined): string {
  if (!address) return '';
  // Try to extract city from address like "123 Main St, Scottsdale, AZ 85251"
  const parts = address.split(',').map(p => p.trim());
  if (parts.length >= 2) {
    // Return second-to-last part (usually city)
    return parts[parts.length - 2] || parts[0];
  }
  return parts[0] || '';
}

/**
 * Format time for SMS (compact format)
 */
function formatTimeForSMS(dateStr: string | undefined, timezone: string): string {
  if (!dateStr) return 'TBD';
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const zonedDate = toZonedTime(date, timezone);
  return formatTz(zonedDate, 'h:mm a', { timeZone: timezone });
}

/**
 * Format date for SMS (compact format like "Thu Dec 12")
 */
function formatDateForSMS(dateStr: string | undefined, timezone: string): string {
  if (!dateStr) return '';
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const zonedDate = toZonedTime(date, timezone);
  return formatTz(zonedDate, 'EEE MMM d', { timeZone: timezone });
}

/**
 * Check if a date is today in the user's timezone
 */
export function isScheduledToday(
  dateStr: string | undefined,
  timezone: string
): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const zonedDate = toZonedTime(date, timezone);
  const zonedNow = toZonedTime(new Date(), timezone);
  return dateFnsIsToday(zonedDate);
}

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Get user's notification preferences
 */
export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferences | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('operator_notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching notification preferences:', error);
    return null;
  }

  return data as NotificationPreferences;
}

/**
 * Check if notification should be sent based on preferences
 */
export async function shouldSendNotification(
  userId: string,
  eventType: NotificationEventType
): Promise<{ send: boolean; reason?: string }> {
  const prefs = await getNotificationPreferences(userId);

  // If no preferences found, create defaults and allow
  if (!prefs) {
    console.log('No preferences found for user, using defaults');
    return { send: true };
  }

  // Check STOP compliance
  if (prefs.sms_unsubscribed) {
    return { send: false, reason: 'User has unsubscribed from SMS' };
  }

  // Check event-specific preference
  // Note: abandoned_call and stale_job_alert are always sent (critical notifications)
  // unless user has unsubscribed entirely
  const prefMap: Record<NotificationEventType, boolean> = {
    same_day_booking: prefs.sms_same_day_booking,
    future_booking: prefs.sms_future_booking,
    callback_request: prefs.sms_callback_request,
    schedule_conflict: prefs.sms_schedule_conflict,
    cancellation: prefs.sms_cancellation,
    // Critical notifications - always send (can't be disabled individually)
    abandoned_call: true,
    stale_job_alert: true,
  };

  if (!prefMap[eventType]) {
    return { send: false, reason: `User disabled SMS for ${eventType}` };
  }

  return { send: true };
}

/**
 * Check if currently in quiet hours for a user
 */
export async function isInQuietHours(
  userId: string,
  timezone: string
): Promise<{ inQuietHours: boolean; quietEndsAt?: Date }> {
  const prefs = await getNotificationPreferences(userId);

  if (!prefs || !prefs.quiet_hours_enabled) {
    return { inQuietHours: false };
  }

  const now = new Date();
  const zonedNow = toZonedTime(now, timezone);
  const currentTime = formatTz(zonedNow, 'HH:mm', { timeZone: timezone });

  const start = prefs.quiet_hours_start; // e.g., "19:00"
  const end = prefs.quiet_hours_end; // e.g., "06:00"

  let inQuietHours = false;

  // Handle overnight quiet hours (e.g., 19:00 to 06:00)
  if (start > end) {
    // Quiet hours span midnight
    inQuietHours = currentTime >= start || currentTime < end;
  } else {
    // Quiet hours within same day
    inQuietHours = currentTime >= start && currentTime < end;
  }

  if (inQuietHours) {
    // Calculate when quiet hours end
    const [endHour, endMin] = end.split(':').map(Number);
    const zonedEnd = toZonedTime(now, timezone);
    zonedEnd.setHours(endHour, endMin, 0, 0);

    // If end time is earlier than current time, it's tomorrow
    if (zonedEnd <= zonedNow) {
      zonedEnd.setDate(zonedEnd.getDate() + 1);
    }

    return { inQuietHours: true, quietEndsAt: zonedEnd };
  }

  return { inQuietHours: false };
}

/**
 * Format notification message based on event type
 * All messages optimized to be under 160 characters
 */
export function formatNotificationMessage(
  eventType: NotificationEventType,
  data: NotificationData,
  timezone: string
): string {
  const time = formatTimeForSMS(data.scheduledAt, timezone);
  const date = formatDateForSMS(data.scheduledAt, timezone);
  const city = extractCity(data.address);
  const service = data.serviceType || 'Service';

  switch (eventType) {
    case 'same_day_booking':
      return notificationTemplates.sameDayBooking(
        data.customerName,
        time,
        service,
        city
      );

    case 'future_booking':
      return notificationTemplates.futureBooking(
        data.customerName,
        date,
        time,
        service
      );

    case 'callback_request':
      return notificationTemplates.callbackRequest(
        data.customerName,
        data.callbackTimeframe || 'soon'
      );

    case 'schedule_conflict':
      return notificationTemplates.scheduleConflict(
        data.customerName,
        time,
        data.conflictingJobName || 'existing job'
      );

    case 'cancellation':
      return notificationTemplates.cancellation(data.customerName, time);

    case 'abandoned_call':
      return notificationTemplates.abandonedCall(
        data.customerName,
        data.customerPhone || 'Unknown'
      );

    case 'stale_job_alert':
      return notificationTemplates.staleJobAlert(
        data.customerName,
        data.hoursWaiting || 24
      );

    default:
      return `CALLLOCK: Update for ${data.customerName}`;
  }
}

/**
 * Queue a notification for later delivery (after quiet hours)
 */
async function queueNotification(
  userId: string,
  jobId: string | null,
  eventType: NotificationEventType,
  messageBody: string,
  sendAt: Date
): Promise<boolean> {
  const supabase = createAdminClient();

  const { error } = await supabase.from('notification_queue').insert({
    user_id: userId,
    job_id: jobId,
    event_type: eventType,
    message_body: messageBody,
    send_at: sendAt.toISOString(),
    status: 'queued',
  });

  if (error) {
    console.error('Error queueing notification:', error);
    return false;
  }

  return true;
}

/**
 * Log SMS to the sms_log table
 */
async function logSMS(params: {
  jobId: string | null;
  userId: string;
  toPhone: string;
  fromPhone: string;
  body: string;
  twilioSid: string | null;
  eventType: NotificationEventType;
  status: string;
}): Promise<void> {
  const supabase = createAdminClient();

  await supabase.from('sms_log').insert({
    job_id: params.jobId,
    user_id: params.userId,
    direction: 'outbound',
    to_phone: params.toPhone,
    from_phone: params.fromPhone,
    body: params.body,
    twilio_sid: params.twilioSid,
    event_type: params.eventType,
    status: params.status,
  });
}

/**
 * Save SMS alert context for reply tracking
 * This allows operators to reply to SMS and update the relevant lead/job
 */
export async function saveAlertContext(params: {
  operatorPhone: string;
  alertType: string;
  leadId?: string;
  customerId?: string;
  jobId?: string;
  customerPhone?: string;
  customerName?: string;
}): Promise<void> {
  const supabase = createAdminClient();

  // Upsert - replace previous context for this operator
  // We only track the most recent alert per operator
  await supabase.from('sms_alert_context').insert({
    operator_phone: params.operatorPhone,
    alert_type: params.alertType,
    lead_id: params.leadId || null,
    customer_id: params.customerId || null,
    job_id: params.jobId || null,
    customer_phone: params.customerPhone || null,
    customer_name: params.customerName || null,
  });
}

/**
 * Get most recent alert context for an operator
 */
export async function getAlertContext(operatorPhone: string): Promise<{
  alertType: string;
  leadId?: string;
  customerId?: string;
  jobId?: string;
  customerPhone?: string;
  customerName?: string;
} | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('sms_alert_context')
    .select('*')
    .eq('operator_phone', operatorPhone)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    alertType: data.alert_type,
    leadId: data.lead_id,
    customerId: data.customer_id,
    jobId: data.job_id,
    customerPhone: data.customer_phone,
    customerName: data.customer_name,
  };
}

/**
 * Main entry point - sends or queues a notification
 */
export async function sendOperatorNotification(
  userId: string,
  jobId: string | null,
  eventType: NotificationEventType,
  data: NotificationData,
  userPhone: string,
  timezone: string,
  options?: {
    leadId?: string;
    customerId?: string;
  }
): Promise<SendResult> {
  // Check if we should send based on preferences
  const shouldSend = await shouldSendNotification(userId, eventType);
  if (!shouldSend.send) {
    return { sent: false, queued: false, reason: shouldSend.reason };
  }

  // Format the message
  const messageBody = formatNotificationMessage(eventType, data, timezone);

  // Check quiet hours
  const quietCheck = await isInQuietHours(userId, timezone);
  if (quietCheck.inQuietHours && quietCheck.quietEndsAt) {
    // Queue for later
    const queued = await queueNotification(
      userId,
      jobId,
      eventType,
      messageBody,
      quietCheck.quietEndsAt
    );

    return {
      sent: false,
      queued,
      reason: queued
        ? `Queued until ${formatTz(quietCheck.quietEndsAt, 'h:mm a')}`
        : 'Failed to queue notification',
    };
  }

  // Send immediately
  const twilioSid = await sendSMS(userPhone, messageBody);

  // Log the SMS
  await logSMS({
    jobId,
    userId,
    toPhone: userPhone,
    fromPhone: process.env.TWILIO_PHONE_NUMBER!,
    body: messageBody,
    twilioSid,
    eventType,
    status: twilioSid ? 'sent' : 'failed',
  });

  // Save alert context for SMS reply tracking
  if (twilioSid) {
    await saveAlertContext({
      operatorPhone: userPhone,
      alertType: eventType,
      leadId: options?.leadId,
      customerId: options?.customerId,
      jobId: jobId || undefined,
      customerPhone: data.customerPhone,
      customerName: data.customerName,
    });

    return { sent: true, queued: false, twilioSid };
  } else {
    return { sent: false, queued: false, reason: 'SMS send failed' };
  }
}

/**
 * Determine notification event type based on job data
 */
export function determineEventType(
  scheduledAt: string | null | undefined,
  timezone: string,
  hasConflict: boolean = false
): NotificationEventType {
  if (hasConflict) {
    return 'schedule_conflict';
  }

  if (!scheduledAt) {
    return 'callback_request'; // No scheduled time = callback scenario
  }

  if (isScheduledToday(scheduledAt, timezone)) {
    return 'same_day_booking';
  }

  return 'future_booking';
}

/**
 * Check for schedule conflicts
 */
export async function checkScheduleConflicts(
  userId: string,
  scheduledAt: string,
  excludeJobId?: string
): Promise<{ hasConflict: boolean; conflictingJob?: { customer_name: string; scheduled_at: string } }> {
  const supabase = createAdminClient();

  // Define conflict window (1 hour before and after)
  const scheduled = new Date(scheduledAt);
  const windowStart = new Date(scheduled.getTime() - 60 * 60 * 1000); // 1 hour before
  const windowEnd = new Date(scheduled.getTime() + 60 * 60 * 1000); // 1 hour after

  let query = supabase
    .from('jobs')
    .select('id, customer_name, scheduled_at')
    .eq('user_id', userId)
    .neq('status', 'cancelled')
    .neq('status', 'complete')
    .gte('scheduled_at', windowStart.toISOString())
    .lt('scheduled_at', windowEnd.toISOString())
    .limit(1);

  if (excludeJobId) {
    query = query.neq('id', excludeJobId);
  }

  const { data: conflicts, error } = await query;

  if (error) {
    console.error('Error checking for conflicts:', error);
    return { hasConflict: false };
  }

  if (conflicts && conflicts.length > 0) {
    return {
      hasConflict: true,
      conflictingJob: {
        customer_name: conflicts[0].customer_name,
        scheduled_at: conflicts[0].scheduled_at,
      },
    };
  }

  return { hasConflict: false };
}

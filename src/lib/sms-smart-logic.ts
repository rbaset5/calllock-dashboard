/**
 * SMS Smart Logic (V4)
 *
 * Intelligent SMS handling including:
 * - De-duplication: Prevent duplicate SMS within time window
 * - Batching: Group non-urgent messages
 * - Escalation: Escalate after no action
 * - Retry: Exponential backoff on failure
 */

import { createAdminClient } from '@/lib/supabase/admin';
import {
  NotificationTier,
  getTierBehavior,
  determineNotificationTier,
  NotificationContext,
} from '@/lib/notification-tiers';

// ============================================
// TYPES
// ============================================

export interface DedupeResult {
  isDuplicate: boolean;
  previousMessageId?: string;
  timeSinceLastMs?: number;
}

export interface BatchedMessage {
  id: string;
  userId: string;
  leadId?: string;
  jobId?: string;
  messageBody: string;
  tier: NotificationTier;
  context: NotificationContext;
  createdAt: Date;
}

export interface RetryConfig {
  attempt: number;
  maxAttempts: number;
  delayMs: number;
  nextRetryAt?: Date;
}

// ============================================
// DE-DUPLICATION
// ============================================

/**
 * Check if a similar message was recently sent
 * Prevents duplicate SMS for the same lead/event within time window
 */
export async function checkDuplicate(
  userId: string,
  leadId: string | null,
  eventType: string,
  windowMinutes: number = 5
): Promise<DedupeResult> {
  const supabase = createAdminClient();

  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

  // Look for recent messages with same user, lead, and event type
  const query = supabase
    .from('sms_log')
    .select('id, created_at')
    .eq('user_id', userId)
    .eq('direction', 'outbound')
    .eq('event_type', eventType)
    .gte('created_at', windowStart.toISOString())
    .order('created_at', { ascending: false })
    .limit(1);

  // Add lead_id filter if provided
  if (leadId) {
    query.eq('lead_id', leadId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error checking for duplicates:', error);
    return { isDuplicate: false };
  }

  if (data && data.length > 0) {
    const lastMessage = data[0];
    const timeSinceLastMs = Date.now() - new Date(lastMessage.created_at).getTime();

    return {
      isDuplicate: true,
      previousMessageId: lastMessage.id,
      timeSinceLastMs,
    };
  }

  return { isDuplicate: false };
}

/**
 * Check if message content is substantially similar to recent messages
 * Uses simple similarity check to catch reformulated duplicates
 */
export async function checkContentSimilarity(
  userId: string,
  messageBody: string,
  windowMinutes: number = 30
): Promise<boolean> {
  const supabase = createAdminClient();

  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

  const { data, error } = await supabase
    .from('sms_log')
    .select('body')
    .eq('user_id', userId)
    .eq('direction', 'outbound')
    .gte('created_at', windowStart.toISOString())
    .limit(10);

  if (error || !data) {
    return false;
  }

  // Simple similarity: check if core content matches
  const normalizedNew = normalizeForComparison(messageBody);

  for (const msg of data) {
    const normalizedExisting = normalizeForComparison(msg.body);
    if (calculateSimilarity(normalizedNew, normalizedExisting) > 0.8) {
      return true;
    }
  }

  return false;
}

/**
 * Normalize message for comparison (remove timestamps, formatting)
 */
function normalizeForComparison(message: string): string {
  return message
    .toLowerCase()
    .replace(/\d{1,2}:\d{2}\s*(am|pm)/gi, '') // Remove times
    .replace(/\d{1,2}\/\d{1,2}/g, '') // Remove dates
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate simple similarity score between two strings
 */
function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const wordsA = new Set(a.split(' '));
  const wordsB = new Set(b.split(' '));

  const intersection = new Set(Array.from(wordsA).filter((x) => wordsB.has(x)));
  const union = new Set([...Array.from(wordsA), ...Array.from(wordsB)]);

  return intersection.size / union.size;
}

// ============================================
// BATCHING
// ============================================

/**
 * Add message to batch queue for delayed delivery
 */
export async function addToBatch(
  userId: string,
  messageBody: string,
  tier: NotificationTier,
  context: NotificationContext,
  options: {
    leadId?: string;
    jobId?: string;
  } = {}
): Promise<string> {
  const supabase = createAdminClient();

  const behavior = getTierBehavior(tier);
  const sendAt = new Date(Date.now() + behavior.maxBatchWindow * 1000);

  const { data, error } = await supabase
    .from('notification_queue')
    .insert({
      user_id: userId,
      lead_id: options.leadId || null,
      job_id: options.jobId || null,
      message_body: messageBody,
      event_type: context.eventType,
      tier,
      send_at: sendAt.toISOString(),
      status: 'queued',
      context: context,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error adding to batch:', error);
    throw new Error('Failed to queue message');
  }

  return data.id;
}

/**
 * Get pending batched messages ready for delivery
 */
export async function getPendingBatchedMessages(
  limit: number = 50
): Promise<BatchedMessage[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('notification_queue')
    .select('*')
    .eq('status', 'queued')
    .lte('send_at', new Date().toISOString())
    .order('send_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching batched messages:', error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    leadId: row.lead_id,
    jobId: row.job_id,
    messageBody: row.message_body,
    tier: row.tier as NotificationTier,
    context: row.context as NotificationContext,
    createdAt: new Date(row.created_at),
  }));
}

/**
 * Mark batched message as sent
 */
export async function markBatchedMessageSent(
  messageId: string,
  twilioSid: string | null
): Promise<void> {
  const supabase = createAdminClient();

  await supabase
    .from('notification_queue')
    .update({
      status: twilioSid ? 'sent' : 'failed',
      sent_at: new Date().toISOString(),
      twilio_sid: twilioSid,
    })
    .eq('id', messageId);
}

/**
 * Consolidate multiple pending messages for same user
 * Returns consolidated message if batching makes sense
 */
export async function consolidateBatch(
  userId: string
): Promise<{ consolidated: boolean; messageBody?: string; messageIds?: string[] }> {
  const supabase = createAdminClient();

  // Get all pending messages for this user
  const { data, error } = await supabase
    .from('notification_queue')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'queued')
    .lte('send_at', new Date().toISOString())
    .order('created_at', { ascending: true });

  if (error || !data || data.length <= 1) {
    return { consolidated: false };
  }

  // If multiple messages, consolidate into summary
  const messageIds = data.map((m) => m.id);
  const leadCount = new Set(data.filter((m) => m.lead_id).map((m) => m.lead_id)).size;

  if (leadCount > 1) {
    // Multiple leads - create summary message
    const urgentCount = data.filter(
      (m) => m.tier === 'URGENT' || m.context?.priorityColor === 'red'
    ).length;

    const messageBody =
      `CALLLOCK: ${leadCount} leads need attention` +
      (urgentCount > 0 ? `\n${urgentCount} urgent` : '') +
      '\nOpen app for details';

    return {
      consolidated: true,
      messageBody,
      messageIds,
    };
  }

  return { consolidated: false };
}

// ============================================
// ESCALATION
// ============================================

/**
 * Check for leads needing escalation (no action after threshold)
 */
export async function checkForEscalation(
  userId: string
): Promise<{ leadId: string; customerName: string; hoursSinceAlert: number }[]> {
  const supabase = createAdminClient();

  // Find leads with STANDARD tier alerts that haven't been actioned
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

  const { data: alerts, error } = await supabase
    .from('sms_alert_context')
    .select('lead_id, customer_name, created_at')
    .eq('user_id', userId)
    .is('replied_at', null)
    .lt('created_at', twoHoursAgo.toISOString())
    .not('alert_type', 'in', '("abandoned_call","emergency_alert")'); // Already urgent

  if (error || !alerts) {
    return [];
  }

  // Check if leads are still active (not converted/lost)
  const leadIds = alerts.filter((a) => a.lead_id).map((a) => a.lead_id);
  if (leadIds.length === 0) return [];

  const { data: activeLeads } = await supabase
    .from('leads')
    .select('id')
    .in('id', leadIds)
    .not('status', 'in', '("converted","lost")');

  const activeLeadIds = new Set((activeLeads || []).map((l) => l.id));

  return alerts
    .filter((a) => a.lead_id && activeLeadIds.has(a.lead_id))
    .map((a) => ({
      leadId: a.lead_id!,
      customerName: a.customer_name || 'Unknown',
      hoursSinceAlert: Math.round(
        (Date.now() - new Date(a.created_at).getTime()) / (60 * 60 * 1000)
      ),
    }));
}

/**
 * Mark lead as escalated
 */
export async function markEscalated(leadId: string): Promise<void> {
  const supabase = createAdminClient();

  await supabase
    .from('leads')
    .update({
      priority_color: 'red',
      priority_reason: 'Escalated - no response after 2 hours',
      updated_at: new Date().toISOString(),
    })
    .eq('id', leadId);
}

// ============================================
// RETRY LOGIC
// ============================================

/**
 * Get retry configuration for failed message
 */
export function getRetryConfig(
  tier: NotificationTier,
  currentAttempt: number
): RetryConfig | null {
  const behavior = getTierBehavior(tier);

  if (currentAttempt >= behavior.retryAttempts) {
    return null; // Max retries exceeded
  }

  const delaySeconds = behavior.retryDelaySeconds[currentAttempt] || 300;
  const nextRetryAt = new Date(Date.now() + delaySeconds * 1000);

  return {
    attempt: currentAttempt + 1,
    maxAttempts: behavior.retryAttempts,
    delayMs: delaySeconds * 1000,
    nextRetryAt,
  };
}

/**
 * Queue message for retry
 */
export async function queueForRetry(
  originalMessageId: string,
  retryConfig: RetryConfig
): Promise<void> {
  const supabase = createAdminClient();

  // Get original message
  const { data: original, error: fetchError } = await supabase
    .from('sms_log')
    .select('*')
    .eq('id', originalMessageId)
    .single();

  if (fetchError || !original) {
    console.error('Failed to fetch original message for retry');
    return;
  }

  // Insert retry record
  await supabase.from('sms_retry_queue').insert({
    original_message_id: originalMessageId,
    user_id: original.user_id,
    to_phone: original.to_phone,
    message_body: original.body,
    event_type: original.event_type,
    retry_attempt: retryConfig.attempt,
    max_attempts: retryConfig.maxAttempts,
    retry_at: retryConfig.nextRetryAt?.toISOString(),
    status: 'pending',
  });
}

/**
 * Get messages due for retry
 */
export async function getMessagesForRetry(
  limit: number = 20
): Promise<
  {
    id: string;
    userId: string;
    toPhone: string;
    messageBody: string;
    retryAttempt: number;
  }[]
> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('sms_retry_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('retry_at', new Date().toISOString())
    .order('retry_at', { ascending: true })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    userId: row.user_id,
    toPhone: row.to_phone,
    messageBody: row.message_body,
    retryAttempt: row.retry_attempt,
  }));
}

/**
 * Mark retry as complete
 */
export async function markRetryComplete(
  retryId: string,
  success: boolean,
  twilioSid?: string
): Promise<void> {
  const supabase = createAdminClient();

  await supabase
    .from('sms_retry_queue')
    .update({
      status: success ? 'sent' : 'failed',
      completed_at: new Date().toISOString(),
      twilio_sid: twilioSid || null,
    })
    .eq('id', retryId);
}

// ============================================
// DAILY DIGEST
// ============================================

/**
 * Generate daily digest for a user
 */
export async function generateDailyDigest(
  userId: string
): Promise<{ shouldSend: boolean; messageBody?: string }> {
  const supabase = createAdminClient();

  // Get today's stats
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Count leads created today
  const { count: totalLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', todayStart.toISOString());

  // Count urgent leads (red priority)
  const { count: urgentLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('priority_color', 'red')
    .not('status', 'in', '("converted","lost")')
    .gte('created_at', todayStart.toISOString());

  // Count booked today
  const { count: bookedToday } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'converted')
    .gte('converted_at', todayStart.toISOString());

  // Only send digest if there was activity
  if (!totalLeads || totalLeads === 0) {
    return { shouldSend: false };
  }

  const messageBody =
    `CALLLOCK Daily:\n` +
    `${totalLeads} leads today\n` +
    `${urgentLeads || 0} need callback\n` +
    `${bookedToday || 0} booked\n` +
    `Open app for details`;

  return {
    shouldSend: true,
    messageBody,
  };
}

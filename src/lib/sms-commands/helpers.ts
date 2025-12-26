import type { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getAlertContext, findLeadByCustomerPhone } from '@/lib/notification-service';
import type { LeadContext, SmsLogEntry } from './types';

/**
 * Get lead context with fallback to customer phone lookup
 */
export async function getLeadContext(operatorPhone: string): Promise<LeadContext | null> {
  // First try to get context from sms_alert_context table
  const context = await getAlertContext(operatorPhone);

  if (context?.leadId) {
    return {
      leadId: context.leadId,
      customerName: context.customerName || 'Lead',
    };
  }

  // Fallback: if we have customer phone but no lead ID, look it up
  if (context?.customerPhone) {
    const leadInfo = await findLeadByCustomerPhone(context.customerPhone);
    if (leadInfo) {
      return leadInfo;
    }
  }

  return null;
}

/**
 * Update alert context status when dispatcher replies
 */
export async function updateAlertContextStatus(
  supabase: SupabaseClient,
  operatorPhone: string,
  replyCode: string
): Promise<void> {
  const phoneWithPlus = operatorPhone.startsWith('+') ? operatorPhone : `+${operatorPhone}`;

  // Find the most recent alert context for this operator (within last hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  await supabase
    .from('sms_alert_context')
    .update({
      status: 'replied',
      replied_at: new Date().toISOString(),
      reply_code: replyCode,
    })
    .eq('operator_phone', phoneWithPlus)
    .gt('created_at', oneHourAgo)
    .is('replied_at', null); // Only update if not already replied
}

/**
 * Add note to a lead (both leads.notes array and operator_notes table)
 */
export async function addNoteToLead(
  supabase: SupabaseClient,
  leadId: string,
  noteText: string,
  from: string,
  userId?: string
): Promise<void> {
  // Get lead info for notes and customer phone
  const { data: lead } = await supabase
    .from('leads')
    .select('notes, customer_phone, customer_name, user_id')
    .eq('id', leadId)
    .single();

  // Add to leads.notes array (legacy behavior)
  const existingNotes = (lead?.notes as Array<{text: string; source: string; created_at: string}>) || [];
  const newNote = {
    text: noteText,
    source: 'sms',
    created_by: from,
    created_at: new Date().toISOString(),
  };

  await supabase
    .from('leads')
    .update({
      notes: [...existingNotes, newNote],
      updated_at: new Date().toISOString()
    })
    .eq('id', leadId);

  // Also add to operator_notes table for unified note display
  if (lead?.customer_phone && (userId || lead?.user_id)) {
    await supabase
      .from('operator_notes')
      .insert({
        user_id: userId || lead.user_id,
        customer_phone: lead.customer_phone,
        customer_name: lead.customer_name || null,
        note_text: noteText,
        created_by: `SMS from ${from}`,
        is_active: true,
        lead_id: leadId,
        synced_from_backend: true,
      });
  }
}

/**
 * Generate TwiML response
 */
export function twimlResponse(message?: string): NextResponse {
  const xml = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`
    : '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

  return new NextResponse(xml, {
    headers: { 'Content-Type': 'text/xml' },
  });
}

/**
 * Log SMS to database
 */
export async function logSms(
  supabase: SupabaseClient,
  entry: SmsLogEntry
): Promise<void> {
  await supabase.from('sms_log').insert(entry);
}

/**
 * Log inbound and outbound SMS together (for reply patterns)
 */
export async function logSmsWithReply(
  supabase: SupabaseClient,
  inbound: SmsLogEntry,
  outbound: Omit<SmsLogEntry, 'direction'> & { twilio_sid?: string | null }
): Promise<void> {
  await supabase.from('sms_log').insert([
    inbound,
    {
      ...outbound,
      direction: 'outbound' as const,
      status: outbound.twilio_sid ? 'sent' : 'failed',
    },
  ]);
}

/**
 * Normalize phone number to +E.164 format
 */
export function normalizePhone(phone: string): string {
  return phone.startsWith('+') ? phone : `+${phone}`;
}

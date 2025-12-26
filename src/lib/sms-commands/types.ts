import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Context passed to each command handler
 */
export interface CommandContext {
  /** Operator's phone number (may or may not have +) */
  from: string;
  /** SMS body (original case preserved) */
  body: string;
  /** SMS body uppercased for matching */
  bodyUpper: string;
  /** Supabase admin client */
  supabase: SupabaseClient;
  /** User ID from users table */
  userId: string;
  /** Twilio phone number */
  twilioPhone: string;
}

/**
 * Lead context for commands that operate on leads
 */
export interface LeadContext {
  leadId: string;
  customerName: string;
}

/**
 * Result returned by command handlers
 */
export interface CommandResult {
  /** Whether command executed successfully */
  success: boolean;
  /** Optional SMS reply to send */
  message?: string;
  /** Reply code for alert context update (e.g., '1', '2', '3') */
  replyCode?: string;
  /** Event type for logging */
  eventType?: 'lead_update' | 'lead_note' | 'lead_booking' | 'lead_snooze' | 'other';
  /** Job ID if one was created */
  jobId?: string;
  /** Lead ID if command operated on a lead */
  leadId?: string;
}

/**
 * Command handler interface
 */
export interface CommandHandler {
  /** Command name for logging */
  name: string;
  /** Priority order (lower = checked first) */
  priority: number;
  /** Test if this handler matches the SMS body */
  match: (bodyUpper: string, bodyOriginal: string) => boolean;
  /** Execute the command */
  execute: (ctx: CommandContext) => Promise<CommandResult>;
}

/**
 * SMS log entry type
 */
export interface SmsLogEntry {
  user_id: string;
  direction: 'inbound' | 'outbound';
  to_phone: string;
  from_phone: string;
  body: string;
  status: 'received' | 'sent' | 'failed';
  event_type: string;
  lead_id?: string;
  job_id?: string;
  twilio_sid?: string;
}

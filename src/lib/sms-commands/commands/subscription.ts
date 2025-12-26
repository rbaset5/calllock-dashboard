import type { CommandHandler, CommandContext, CommandResult } from '../types';
import { logSms } from '../helpers';

const STOP_KEYWORDS = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'];
const START_KEYWORDS = ['START', 'UNSTOP', 'SUBSCRIBE'];

/**
 * STOP - Unsubscribe from SMS (legal requirement)
 */
export const stopCommand: CommandHandler = {
  name: 'stop',
  priority: 1, // Highest priority - legal requirement
  match: (bodyUpper) => STOP_KEYWORDS.includes(bodyUpper),
  execute: async (ctx: CommandContext): Promise<CommandResult> => {
    const { supabase, userId, from, body, twilioPhone } = ctx;

    // Update notification preferences to mark as unsubscribed
    await supabase
      .from('operator_notification_preferences')
      .update({
        sms_unsubscribed: true,
        sms_unsubscribed_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    // Log the inbound SMS
    await logSms(supabase, {
      user_id: userId,
      direction: 'inbound',
      to_phone: twilioPhone,
      from_phone: from,
      body: body,
      status: 'received',
      event_type: 'other',
    });

    // Twilio automatically handles STOP responses
    // Don't send a response - Twilio handles STOP automatically
    console.log(`User ${userId} unsubscribed from SMS`);

    return {
      success: true,
      eventType: 'other',
    };
  },
};

/**
 * START - Resubscribe to SMS
 */
export const startCommand: CommandHandler = {
  name: 'start',
  priority: 2,
  match: (bodyUpper) => START_KEYWORDS.includes(bodyUpper),
  execute: async (ctx: CommandContext): Promise<CommandResult> => {
    const { supabase, userId, from, body, twilioPhone } = ctx;

    await supabase
      .from('operator_notification_preferences')
      .update({
        sms_unsubscribed: false,
        sms_unsubscribed_at: null,
      })
      .eq('user_id', userId);

    await logSms(supabase, {
      user_id: userId,
      direction: 'inbound',
      to_phone: twilioPhone,
      from_phone: from,
      body: body,
      status: 'received',
      event_type: 'other',
    });

    console.log(`User ${userId} resubscribed to SMS`);

    return {
      success: true,
      eventType: 'other',
    };
  },
};

export const subscriptionCommands: CommandHandler[] = [stopCommand, startCommand];

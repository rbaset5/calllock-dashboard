import { sendSMS } from '@/lib/twilio';
import type { CommandHandler, CommandContext, CommandResult } from '../types';
import { logSms } from '../helpers';

/**
 * HELP / ? - Show available commands
 */
export const helpCommand: CommandHandler = {
  name: 'help',
  priority: 70,
  match: (bodyUpper) => {
    return bodyUpper === 'HELP' || bodyUpper === '?';
  },
  execute: async (ctx: CommandContext): Promise<CommandResult> => {
    const { supabase, userId, from, body, twilioPhone } = ctx;

    const helpMsg =
      'Codes: 1=Called 2=VM 3=Note 4=Booked 5=Lost\n' +
      'Book: 4 TUE 2PM or BOOK TOMORROW 9AM\n' +
      'Snooze: SNOOZE 1H, SNOOZE TOMORROW\n' +
      'More: OK CALL STOP';

    await sendSMS(from, helpMsg);

    await logSms(supabase, {
      user_id: userId,
      direction: 'inbound',
      to_phone: twilioPhone,
      from_phone: from,
      body: body,
      status: 'received',
      event_type: 'other',
    });

    return {
      success: true,
      eventType: 'other',
    };
  },
};

export const helpCommands: CommandHandler[] = [helpCommand];

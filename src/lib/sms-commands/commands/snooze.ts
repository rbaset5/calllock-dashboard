import { sendSMS } from '@/lib/twilio';
import { parseSnoozeFromSMS, generateSnoozeConfirmation } from '@/lib/sms-time-parser';
import type { CommandHandler, CommandContext, CommandResult } from '../types';
import { getLeadContext, addNoteToLead, logSms } from '../helpers';

/**
 * SNOOZE - Remind later
 * Format: SNOOZE 1H, SNOOZE 3H, SNOOZE TOMORROW, SNOOZE TOMORROW PM
 */
export const snoozeCommand: CommandHandler = {
  name: 'snooze',
  priority: 20,
  match: (bodyUpper) => {
    return bodyUpper.startsWith('SNOOZE');
  },
  execute: async (ctx: CommandContext): Promise<CommandResult> => {
    const { supabase, userId, from, body, twilioPhone } = ctx;
    const snoozePart = body.substring(6).trim();
    const leadContext = await getLeadContext(from);

    if (!leadContext) {
      await sendSMS(from, 'No recent lead to snooze. Open the app to manage leads.');
      return { success: false };
    }

    // Parse snooze duration
    const parsed = parseSnoozeFromSMS(snoozePart);

    if (!parsed.success || !parsed.snoozeUntil) {
      await sendSMS(
        from,
        'Snooze format: SNOOZE 1H, SNOOZE 3H, SNOOZE TOMORROW, SNOOZE TOMORROW PM'
      );
      return { success: false };
    }

    // Update lead with snooze time
    await supabase
      .from('leads')
      .update({
        remind_at: parsed.snoozeUntil.toISOString(),
        callback_outcome: 'try_again',
        callback_outcome_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadContext.leadId);

    // Add note
    await addNoteToLead(
      supabase,
      leadContext.leadId,
      `Snoozed until ${parsed.displayText}`,
      from,
      userId
    );

    const confirmMsg = generateSnoozeConfirmation(leadContext.customerName, parsed.snoozeUntil);
    await sendSMS(from, confirmMsg);

    await logSms(supabase, {
      user_id: userId,
      lead_id: leadContext.leadId,
      direction: 'inbound',
      to_phone: twilioPhone,
      from_phone: from,
      body: body,
      status: 'received',
      event_type: 'lead_snooze',
    });

    console.log(`Lead ${leadContext.leadId} snoozed until ${parsed.snoozeUntil.toISOString()}`);

    return {
      success: true,
      eventType: 'lead_snooze',
      leadId: leadContext.leadId,
    };
  },
};

export const snoozeCommands: CommandHandler[] = [snoozeCommand];

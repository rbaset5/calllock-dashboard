import { sendSMS } from '@/lib/twilio';
import { getAlertContext } from '@/lib/notification-service';
import type { CommandHandler, CommandContext, CommandResult } from '../types';
import { getLeadContext, updateAlertContextStatus, addNoteToLead, logSms } from '../helpers';

/**
 * Code 3 + text - Add note (e.g., "3 Customer prefers mornings")
 */
export const code3NoteCommand: CommandHandler = {
  name: 'code-3-note',
  priority: 13, // After codes 1, 2 but before 4, 5 to catch "3 text"
  match: (bodyUpper, bodyOriginal) => {
    return bodyOriginal.startsWith('3 ') || bodyOriginal.startsWith('3:');
  },
  execute: async (ctx: CommandContext): Promise<CommandResult> => {
    const { supabase, userId, from, body, twilioPhone } = ctx;
    const noteText = body.substring(2).trim();

    if (!noteText) {
      await sendSMS(from, 'Please include a note after 3 (e.g., "3 Customer prefers mornings")');
      return { success: false };
    }

    const leadContext = await getLeadContext(from);

    if (!leadContext) {
      await sendSMS(from, 'No recent lead to add note to. Open the app to manage leads.');
      return { success: false };
    }

    await addNoteToLead(supabase, leadContext.leadId, noteText, from, userId);
    await updateAlertContextStatus(supabase, from, '3');

    const confirmMsg = `✓ Note added to ${leadContext.customerName}`;
    await sendSMS(from, confirmMsg);

    await logSms(supabase, {
      user_id: userId,
      direction: 'inbound',
      to_phone: twilioPhone,
      from_phone: from,
      body: body,
      status: 'received',
      event_type: 'lead_note',
    });

    console.log(`Note added to lead ${leadContext.leadId} via code 3`);

    return {
      success: true,
      replyCode: '3',
      eventType: 'lead_note',
      leadId: leadContext.leadId,
    };
  },
};

/**
 * NOTE: [text] or NOTE [text] - Add note to lead
 */
export const notePrefixCommand: CommandHandler = {
  name: 'note-prefix',
  priority: 60,
  match: (bodyUpper) => {
    return bodyUpper.startsWith('NOTE:') || bodyUpper.startsWith('NOTE ');
  },
  execute: async (ctx: CommandContext): Promise<CommandResult> => {
    const { supabase, userId, from, body, twilioPhone } = ctx;

    // Extract note text - handle both "NOTE:" and "NOTE "
    let noteText: string;
    if (body.toUpperCase().startsWith('NOTE:')) {
      noteText = body.substring(body.indexOf(':') + 1).trim();
    } else {
      noteText = body.substring(5).trim();
    }

    if (!noteText) {
      await sendSMS(from, 'Please include a note after NOTE:');
      return { success: false };
    }

    const context = await getAlertContext(from);

    if (!context?.leadId) {
      await sendSMS(from, 'No recent lead to add note to. Open the app to manage leads.');
      return { success: false };
    }

    await addNoteToLead(supabase, context.leadId, noteText, from, userId);

    const confirmMsg = `✓ Note added to ${context.customerName || 'lead'}`;
    await sendSMS(from, confirmMsg);

    await logSms(supabase, {
      user_id: userId,
      direction: 'inbound',
      to_phone: twilioPhone,
      from_phone: from,
      body: body,
      status: 'received',
      event_type: 'lead_note',
    });

    console.log(`Note added to lead ${context.leadId} via SMS`);

    return {
      success: true,
      eventType: 'lead_note',
      leadId: context.leadId,
    };
  },
};

/**
 * Free text - treat as note if we have context and body is meaningful
 */
export const freeTextNoteCommand: CommandHandler = {
  name: 'free-text-note',
  priority: 100, // Lowest priority - catch-all
  match: (bodyUpper) => {
    // Only match if not a known command
    const knownCommands = ['OK', 'Y', 'YES', 'CONFIRM', 'CALL', 'PHONE', 'NUMBER'];
    return bodyUpper.length > 3 && !knownCommands.includes(bodyUpper);
  },
  execute: async (ctx: CommandContext): Promise<CommandResult> => {
    const { supabase, userId, from, body, twilioPhone } = ctx;
    const context = await getAlertContext(from);

    if (!context?.leadId) {
      // No context - just log and return silently
      console.log(`Unknown SMS command from ${from}: ${body}`);
      await logSms(supabase, {
        user_id: userId,
        direction: 'inbound',
        to_phone: twilioPhone,
        from_phone: from,
        body: body,
        status: 'received',
        event_type: 'other',
      });
      return { success: false };
    }

    // Treat as a note
    await addNoteToLead(supabase, context.leadId, body.trim(), from, userId);

    const confirmMsg = `✓ Note added to ${context.customerName || 'lead'}`;
    await sendSMS(from, confirmMsg);

    await logSms(supabase, {
      user_id: userId,
      direction: 'inbound',
      to_phone: twilioPhone,
      from_phone: from,
      body: body,
      status: 'received',
      event_type: 'lead_note',
    });

    console.log(`Free text note added to lead ${context.leadId} via SMS`);

    return {
      success: true,
      eventType: 'lead_note',
      leadId: context.leadId,
    };
  },
};

export const noteCommands: CommandHandler[] = [code3NoteCommand, notePrefixCommand, freeTextNoteCommand];

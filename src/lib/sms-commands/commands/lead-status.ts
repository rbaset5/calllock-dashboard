import { sendSMS } from '@/lib/twilio';
import { getAlertContext } from '@/lib/notification-service';
import type { CommandHandler, CommandContext, CommandResult } from '../types';
import { getLeadContext, updateAlertContextStatus, addNoteToLead, logSms } from '../helpers';

type StatusConfig = {
  code: string;
  status: string;
  noteText: string;
  confirmLabel: string;
  lostReason?: string;
};

const STATUS_CONFIGS: StatusConfig[] = [
  { code: '1', status: 'callback_requested', noteText: 'Contacted via phone', confirmLabel: 'CONTACTED' },
  { code: '2', status: 'voicemail_left', noteText: 'Left voicemail', confirmLabel: 'VOICEMAIL' },
  { code: '4', status: 'converted', noteText: 'Scheduled appointment', confirmLabel: 'SCHEDULED' },
  { code: '5', status: 'lost', noteText: 'Customer not interested', confirmLabel: 'LOST', lostReason: 'Not interested (marked via SMS)' },
];

/**
 * Creates a lead status update command handler
 */
function createStatusCommand(config: StatusConfig): CommandHandler {
  return {
    name: `code-${config.code}`,
    priority: 10 + parseInt(config.code),
    match: (bodyUpper) => bodyUpper === config.code,
    execute: async (ctx: CommandContext): Promise<CommandResult> => {
      const { supabase, userId, from, body, twilioPhone } = ctx;
      const leadContext = await getLeadContext(from);

      if (!leadContext) {
        await sendSMS(from, 'No recent lead to update. Open the app to manage leads.');
        return { success: false };
      }

      // Build update object
      const updateData: Record<string, unknown> = {
        status: config.status,
        updated_at: new Date().toISOString(),
      };
      if (config.lostReason) {
        updateData.lost_reason = config.lostReason;
      }

      await supabase
        .from('leads')
        .update(updateData)
        .eq('id', leadContext.leadId);

      // Add auto-note
      await addNoteToLead(supabase, leadContext.leadId, config.noteText, from, userId);

      // Update alert context status
      await updateAlertContextStatus(supabase, from, config.code);

      const confirmMsg = `✓ ${leadContext.customerName} marked ${config.confirmLabel}`;
      await sendSMS(from, confirmMsg);

      await logSms(supabase, {
        user_id: userId,
        direction: 'inbound',
        to_phone: twilioPhone,
        from_phone: from,
        body: body,
        status: 'received',
        event_type: 'lead_update',
      });

      console.log(`Lead ${leadContext.leadId} marked ${config.status} via code ${config.code}`);

      return {
        success: true,
        replyCode: config.code,
        eventType: 'lead_update',
        leadId: leadContext.leadId,
      };
    },
  };
}

/**
 * Word-based status commands (CONTACTED, SCHEDULED, CLOSED, etc.)
 */
type WordStatusConfig = {
  keywords: string[];
  status: string;
  confirmLabel: string;
};

const WORD_STATUS_CONFIGS: WordStatusConfig[] = [
  { keywords: ['CONTACTED', 'CALLED'], status: 'contacted', confirmLabel: 'CONTACTED' },
  { keywords: ['SCHEDULED', 'BOOKED'], status: 'converted', confirmLabel: 'SCHEDULED' },
  { keywords: ['CLOSED', 'LOST'], status: 'lost', confirmLabel: 'CLOSED' },
];

function createWordStatusCommand(config: WordStatusConfig): CommandHandler {
  return {
    name: `word-${config.keywords[0].toLowerCase()}`,
    priority: 50 + WORD_STATUS_CONFIGS.indexOf(config),
    match: (bodyUpper) => config.keywords.includes(bodyUpper),
    execute: async (ctx: CommandContext): Promise<CommandResult> => {
      const { supabase, userId, from, body, twilioPhone } = ctx;
      const context = await getAlertContext(from);

      if (!context?.leadId) {
        await sendSMS(from, 'No recent lead to update. Open the app to manage leads.');
        return { success: false };
      }

      await supabase
        .from('leads')
        .update({ status: config.status, updated_at: new Date().toISOString() })
        .eq('id', context.leadId);

      const confirmMsg = `✓ ${context.customerName || 'Lead'} marked ${config.confirmLabel}`;
      await sendSMS(from, confirmMsg);

      await logSms(supabase, {
        user_id: userId,
        direction: 'inbound',
        to_phone: twilioPhone,
        from_phone: from,
        body: body,
        status: 'received',
        event_type: 'lead_update',
      });

      console.log(`Lead ${context.leadId} marked ${config.status} via SMS`);

      return {
        success: true,
        eventType: 'lead_update',
        leadId: context.leadId,
      };
    },
  };
}

// Generate all status commands
export const codeStatusCommands: CommandHandler[] = STATUS_CONFIGS.map(createStatusCommand);
export const wordStatusCommands: CommandHandler[] = WORD_STATUS_CONFIGS.map(createWordStatusCommand);
export const leadStatusCommands: CommandHandler[] = [...codeStatusCommands, ...wordStatusCommands];

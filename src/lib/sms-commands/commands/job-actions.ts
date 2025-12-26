import { sendSMS, smsTemplates, notificationTemplates } from '@/lib/twilio';
import type { CommandHandler, CommandContext, CommandResult } from '../types';

/**
 * CALL / PHONE / NUMBER - Get customer phone number
 */
export const callInfoCommand: CommandHandler = {
  name: 'call-info',
  priority: 40,
  match: (bodyUpper) => {
    return ['CALL', 'PHONE', 'NUMBER'].includes(bodyUpper);
  },
  execute: async (ctx: CommandContext): Promise<CommandResult> => {
    const { supabase, userId, from, body, twilioPhone } = ctx;

    // Find most recent job for this user
    const { data: job } = await supabase
      .from('jobs')
      .select('id, customer_name, customer_phone')
      .eq('user_id', userId)
      .in('status', ['new', 'confirmed'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!job || !job.customer_phone) {
      await sendSMS(from, 'No recent job found. Open the app to see your jobs.');
      return { success: false };
    }

    const phoneMsg = notificationTemplates.customerPhone(job.customer_name, job.customer_phone);
    const smsSid = await sendSMS(from, phoneMsg);

    // Log both messages
    await supabase.from('sms_log').insert([
      {
        job_id: job.id,
        user_id: userId,
        direction: 'inbound',
        to_phone: twilioPhone,
        from_phone: from,
        body: body,
        status: 'received',
        event_type: 'other',
      },
      {
        job_id: job.id,
        user_id: userId,
        direction: 'outbound',
        to_phone: from,
        from_phone: twilioPhone,
        body: phoneMsg,
        twilio_sid: smsSid,
        status: smsSid ? 'sent' : 'failed',
        event_type: 'reply_customer_phone',
      },
    ]);

    console.log(`Sent customer phone for job ${job.id} via SMS reply`);

    return {
      success: true,
      eventType: 'other',
      jobId: job.id,
    };
  },
};

/**
 * COMPLETE / DONE / FINISHED - Mark job complete
 */
export const completeJobCommand: CommandHandler = {
  name: 'complete-job',
  priority: 45,
  match: (bodyUpper) => {
    return ['COMPLETE', 'DONE', 'FINISHED'].includes(bodyUpper);
  },
  execute: async (ctx: CommandContext): Promise<CommandResult> => {
    const { supabase, userId, from, body, twilioPhone } = ctx;

    // Find most recent needs_action job for this user
    const { data: job } = await supabase
      .from('jobs')
      .select('id, customer_name')
      .eq('user_id', userId)
      .eq('needs_action', true)
      .not('status', 'in', '("complete","cancelled")')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!job) {
      await sendSMS(from, 'No jobs currently flagged as needing action.');
      return { success: false };
    }

    // Mark as complete
    await supabase
      .from('jobs')
      .update({
        status: 'complete',
        needs_action: false,
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    // Send confirmation SMS
    const confirmationMsg = smsTemplates.completeConfirmation(job.customer_name);
    await sendSMS(from, confirmationMsg);

    // Log the inbound and outbound SMS
    await supabase.from('sms_log').insert([
      {
        job_id: job.id,
        user_id: userId,
        direction: 'inbound',
        to_phone: twilioPhone,
        from_phone: from,
        body: body,
        status: 'received',
        event_type: 'other',
      },
      {
        job_id: job.id,
        user_id: userId,
        direction: 'outbound',
        to_phone: from,
        from_phone: twilioPhone,
        body: confirmationMsg,
        status: 'sent',
        event_type: 'complete_confirmation',
      },
    ]);

    console.log(`Job ${job.id} marked complete via SMS`);

    return {
      success: true,
      eventType: 'other',
      jobId: job.id,
    };
  },
};

export const jobActionCommands: CommandHandler[] = [callInfoCommand, completeJobCommand];

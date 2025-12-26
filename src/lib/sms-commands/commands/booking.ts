import { sendSMS, notificationTemplates } from '@/lib/twilio';
import { parseTimeFromSMS, generateBookingConfirmation } from '@/lib/sms-time-parser';
import type { CommandHandler, CommandContext, CommandResult } from '../types';
import { getLeadContext, logSms } from '../helpers';

/**
 * Code 4 with time - Book with specific time (e.g., "4 TUE 2PM", "4 TOMORROW 9AM")
 */
export const code4BookingCommand: CommandHandler = {
  name: 'code-4-booking',
  priority: 14, // After code 3, before plain code 4
  match: (_bodyUpper, bodyOriginal) => {
    return bodyOriginal.toUpperCase().startsWith('4 ');
  },
  execute: async (ctx: CommandContext): Promise<CommandResult> => {
    const { supabase, userId, from, body, twilioPhone } = ctx;
    const timePart = body.substring(2).trim();
    const leadContext = await getLeadContext(from);

    if (!leadContext) {
      await sendSMS(from, 'No recent lead to book. Open the app to manage leads.');
      return { success: false };
    }

    // Parse the time
    const parsed = parseTimeFromSMS(timePart);

    if (!parsed.success || !parsed.dateTime) {
      const promptMsg = parsed.clarificationPrompt || 'When? Reply: 4 TUE 2PM, 4 TOMORROW 9AM';
      await sendSMS(from, promptMsg);
      return { success: false };
    }

    // Get lead details for booking
    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadContext.leadId)
      .single();

    if (!lead) {
      await sendSMS(from, 'Lead not found. Open the app to manage leads.');
      return { success: false };
    }

    // Create job from lead
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: userId,
        customer_name: lead.customer_name,
        customer_phone: lead.customer_phone,
        customer_address: lead.customer_address || '',
        service_type: lead.service_type || 'hvac',
        urgency: lead.urgency || 'medium',
        ai_summary: lead.ai_summary,
        scheduled_at: parsed.dateTime.toISOString(),
        estimated_value: lead.estimated_value,
        status: 'confirmed',
        is_ai_booked: false,
        booking_confirmed: true,
        priority_color: lead.priority_color,
        priority_reason: lead.priority_reason,
      })
      .select('id')
      .single();

    if (jobError || !job) {
      console.error('Failed to create job via SMS:', jobError);
      await sendSMS(from, 'Failed to book. Please try in the app.');
      return { success: false };
    }

    // Update lead as converted
    await supabase
      .from('leads')
      .update({
        status: 'converted',
        converted_job_id: job.id,
        converted_at: new Date().toISOString(),
        callback_outcome: 'booked',
        callback_outcome_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadContext.leadId);

    // Send confirmation
    const confirmMsg = generateBookingConfirmation(leadContext.customerName, parsed.dateTime);
    await sendSMS(from, confirmMsg);

    await logSms(supabase, {
      user_id: userId,
      lead_id: leadContext.leadId,
      job_id: job.id,
      direction: 'inbound',
      to_phone: twilioPhone,
      from_phone: from,
      body: body,
      status: 'received',
      event_type: 'lead_booking',
    });

    console.log(`Lead ${leadContext.leadId} booked as job ${job.id} via SMS`);

    return {
      success: true,
      eventType: 'lead_booking',
      leadId: leadContext.leadId,
      jobId: job.id,
    };
  },
};

/**
 * BOOK with time - Alternative booking format (e.g., "BOOK TUE 2PM", "BOOK TOMORROW 9AM")
 */
export const bookPrefixCommand: CommandHandler = {
  name: 'book-prefix',
  priority: 25,
  match: (bodyUpper) => {
    return bodyUpper.startsWith('BOOK ');
  },
  execute: async (ctx: CommandContext): Promise<CommandResult> => {
    const { supabase, userId, from, body, twilioPhone } = ctx;
    const timePart = body.substring(5).trim();
    const leadContext = await getLeadContext(from);

    if (!leadContext) {
      await sendSMS(from, 'No recent lead to book. Open the app to manage leads.');
      return { success: false };
    }

    const parsed = parseTimeFromSMS(timePart);

    if (!parsed.success || !parsed.dateTime) {
      const promptMsg = parsed.clarificationPrompt || 'When? Reply: BOOK TUE 2PM, BOOK TOMORROW 9AM';
      await sendSMS(from, promptMsg);
      return { success: false };
    }

    // Get lead details
    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadContext.leadId)
      .single();

    if (!lead) {
      await sendSMS(from, 'Lead not found. Open the app to manage leads.');
      return { success: false };
    }

    // Create job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: userId,
        customer_name: lead.customer_name,
        customer_phone: lead.customer_phone,
        customer_address: lead.customer_address || '',
        service_type: lead.service_type || 'hvac',
        urgency: lead.urgency || 'medium',
        ai_summary: lead.ai_summary,
        scheduled_at: parsed.dateTime.toISOString(),
        estimated_value: lead.estimated_value,
        status: 'confirmed',
        is_ai_booked: false,
        booking_confirmed: true,
        priority_color: lead.priority_color,
        priority_reason: lead.priority_reason,
      })
      .select('id')
      .single();

    if (jobError || !job) {
      console.error('Failed to create job via SMS:', jobError);
      await sendSMS(from, 'Failed to book. Please try in the app.');
      return { success: false };
    }

    // Update lead
    await supabase
      .from('leads')
      .update({
        status: 'converted',
        converted_job_id: job.id,
        converted_at: new Date().toISOString(),
        callback_outcome: 'booked',
        callback_outcome_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadContext.leadId);

    const confirmMsg = generateBookingConfirmation(leadContext.customerName, parsed.dateTime);
    await sendSMS(from, confirmMsg);

    await logSms(supabase, {
      user_id: userId,
      lead_id: leadContext.leadId,
      job_id: job.id,
      direction: 'inbound',
      to_phone: twilioPhone,
      from_phone: from,
      body: body,
      status: 'received',
      event_type: 'lead_booking',
    });

    console.log(`Lead ${leadContext.leadId} booked as job ${job.id} via SMS BOOK command`);

    return {
      success: true,
      eventType: 'lead_booking',
      leadId: leadContext.leadId,
      jobId: job.id,
    };
  },
};

/**
 * OK / Y / YES / CONFIRM - Confirm pending AI booking
 */
export const confirmBookingCommand: CommandHandler = {
  name: 'confirm-booking',
  priority: 30,
  match: (bodyUpper) => {
    return ['OK', 'Y', 'YES', 'CONFIRM'].includes(bodyUpper);
  },
  execute: async (ctx: CommandContext): Promise<CommandResult> => {
    const { supabase, userId, from, body, twilioPhone } = ctx;

    // Find most recent unconfirmed AI-booked job for this user
    const { data: job } = await supabase
      .from('jobs')
      .select('id, customer_name')
      .eq('user_id', userId)
      .eq('status', 'new')
      .eq('is_ai_booked', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!job) {
      await sendSMS(from, 'No pending booking to confirm. Open the app to see your schedule.');
      return { success: false };
    }

    // Confirm the job
    await supabase
      .from('jobs')
      .update({
        status: 'confirmed',
        booking_confirmed: true,
      })
      .eq('id', job.id);

    // Also update AI booking review if exists
    await supabase
      .from('ai_booking_reviews')
      .update({
        status: 'confirmed',
        reviewed_at: new Date().toISOString(),
      })
      .eq('job_id', job.id);

    // Send confirmation
    const confirmationMsg = notificationTemplates.confirmBooking(job.customer_name);
    const smsSid = await sendSMS(from, confirmationMsg);

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
        body: confirmationMsg,
        twilio_sid: smsSid,
        status: smsSid ? 'sent' : 'failed',
        event_type: 'reply_confirmation',
      },
    ]);

    console.log(`Confirmed job ${job.id} via SMS reply`);

    return {
      success: true,
      eventType: 'other',
      jobId: job.id,
    };
  },
};

export const bookingCommands: CommandHandler[] = [
  code4BookingCommand,
  bookPrefixCommand,
  confirmBookingCommand,
];

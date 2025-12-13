import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendSMS, smsTemplates, notificationTemplates } from '@/lib/twilio';
import { getAlertContext } from '@/lib/notification-service';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const body = (formData.get('Body') as string)?.trim().toUpperCase();

    if (!from || !body) {
      return twimlResponse('');
    }

    const supabase = createAdminClient();

    // Normalize phone number for lookup
    const phoneWithPlus = from.startsWith('+') ? from : `+${from}`;

    // Find user by phone number
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('phone', phoneWithPlus)
      .single();

    if (userError || !userData) {
      console.log('No user found for phone:', from);
      return twimlResponse('');
    }

    const userId = userData.id;

    // ============================================
    // STOP - Unsubscribe (legal requirement)
    // ============================================
    if (body === 'STOP' || body === 'UNSUBSCRIBE' || body === 'CANCEL' || body === 'END' || body === 'QUIT') {
      // Update notification preferences to mark as unsubscribed
      await supabase
        .from('operator_notification_preferences')
        .update({
          sms_unsubscribed: true,
          sms_unsubscribed_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      // Log the inbound SMS
      await supabase.from('sms_log').insert({
        user_id: userId,
        direction: 'inbound',
        to_phone: process.env.TWILIO_PHONE_NUMBER!,
        from_phone: from,
        body: body,
        status: 'received',
        event_type: 'other',
      });

      // Twilio automatically handles STOP responses, but we track it
      // Don't send a response - Twilio handles STOP automatically
      console.log(`User ${userId} unsubscribed from SMS`);
      return twimlResponse('');
    }

    // ============================================
    // START - Resubscribe
    // ============================================
    if (body === 'START' || body === 'UNSTOP' || body === 'SUBSCRIBE') {
      await supabase
        .from('operator_notification_preferences')
        .update({
          sms_unsubscribed: false,
          sms_unsubscribed_at: null,
        })
        .eq('user_id', userId);

      await supabase.from('sms_log').insert({
        user_id: userId,
        direction: 'inbound',
        to_phone: process.env.TWILIO_PHONE_NUMBER!,
        from_phone: from,
        body: body,
        status: 'received',
        event_type: 'other',
      });

      console.log(`User ${userId} resubscribed to SMS`);
      return twimlResponse('');
    }

    // ============================================
    // OK / Y / YES - Confirm booking
    // ============================================
    if (body === 'OK' || body === 'Y' || body === 'YES' || body === 'CONFIRM') {
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

      if (job) {
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
            to_phone: process.env.TWILIO_PHONE_NUMBER!,
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
            from_phone: process.env.TWILIO_PHONE_NUMBER!,
            body: confirmationMsg,
            twilio_sid: smsSid,
            status: smsSid ? 'sent' : 'failed',
            event_type: 'reply_confirmation',
          },
        ]);

        console.log(`Confirmed job ${job.id} via SMS reply`);
        return twimlResponse('');
      } else {
        // No job found to confirm
        await sendSMS(from, 'No pending booking to confirm. Open the app to see your schedule.');
        return twimlResponse('');
      }
    }

    // ============================================
    // CALL - Get customer phone number
    // ============================================
    if (body === 'CALL' || body === 'PHONE' || body === 'NUMBER') {
      // Find most recent job for this user
      const { data: job } = await supabase
        .from('jobs')
        .select('id, customer_name, customer_phone')
        .eq('user_id', userId)
        .in('status', ['new', 'confirmed'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (job && job.customer_phone) {
        const phoneMsg = notificationTemplates.customerPhone(
          job.customer_name,
          job.customer_phone
        );
        const smsSid = await sendSMS(from, phoneMsg);

        // Log both messages
        await supabase.from('sms_log').insert([
          {
            job_id: job.id,
            user_id: userId,
            direction: 'inbound',
            to_phone: process.env.TWILIO_PHONE_NUMBER!,
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
            from_phone: process.env.TWILIO_PHONE_NUMBER!,
            body: phoneMsg,
            twilio_sid: smsSid,
            status: smsSid ? 'sent' : 'failed',
            event_type: 'reply_customer_phone',
          },
        ]);

        console.log(`Sent customer phone for job ${job.id} via SMS reply`);
        return twimlResponse('');
      } else {
        await sendSMS(from, 'No recent job found. Open the app to see your jobs.');
        return twimlResponse('');
      }
    }

    // ============================================
    // COMPLETE / DONE - Mark job complete (legacy)
    // ============================================
    if (body === 'COMPLETE' || body === 'DONE' || body === 'FINISHED') {
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

      if (job) {
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
            to_phone: process.env.TWILIO_PHONE_NUMBER!,
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
            from_phone: process.env.TWILIO_PHONE_NUMBER!,
            body: confirmationMsg,
            status: 'sent',
            event_type: 'complete_confirmation',
          },
        ]);

        return twimlResponse('');
      } else {
        // No job found needing action
        await sendSMS(from, 'No jobs currently flagged as needing action.');
        return twimlResponse('');
      }
    }

    // ============================================
    // CONTACTED / CALLED - Mark lead as contacted
    // ============================================
    if (body === 'CONTACTED' || body === 'CALLED') {
      const context = await getAlertContext(from);

      if (context?.leadId) {
        await supabase
          .from('leads')
          .update({ status: 'contacted', updated_at: new Date().toISOString() })
          .eq('id', context.leadId);

        const confirmMsg = `✓ ${context.customerName || 'Lead'} marked CONTACTED`;
        await sendSMS(from, confirmMsg);

        await supabase.from('sms_log').insert({
          user_id: userId,
          direction: 'inbound',
          to_phone: process.env.TWILIO_PHONE_NUMBER!,
          from_phone: from,
          body: body,
          status: 'received',
          event_type: 'lead_update',
        });

        console.log(`Lead ${context.leadId} marked contacted via SMS`);
        return twimlResponse('');
      } else {
        await sendSMS(from, 'No recent lead to update. Open the app to manage leads.');
        return twimlResponse('');
      }
    }

    // ============================================
    // SCHEDULED / BOOKED - Mark lead as converted
    // ============================================
    if (body === 'SCHEDULED' || body === 'BOOKED') {
      const context = await getAlertContext(from);

      if (context?.leadId) {
        await supabase
          .from('leads')
          .update({ status: 'converted', updated_at: new Date().toISOString() })
          .eq('id', context.leadId);

        const confirmMsg = `✓ ${context.customerName || 'Lead'} marked SCHEDULED`;
        await sendSMS(from, confirmMsg);

        await supabase.from('sms_log').insert({
          user_id: userId,
          direction: 'inbound',
          to_phone: process.env.TWILIO_PHONE_NUMBER!,
          from_phone: from,
          body: body,
          status: 'received',
          event_type: 'lead_update',
        });

        console.log(`Lead ${context.leadId} marked converted via SMS`);
        return twimlResponse('');
      } else {
        await sendSMS(from, 'No recent lead to update. Open the app to manage leads.');
        return twimlResponse('');
      }
    }

    // ============================================
    // CLOSED / LOST - Mark lead as lost
    // ============================================
    if (body === 'CLOSED' || body === 'LOST') {
      const context = await getAlertContext(from);

      if (context?.leadId) {
        await supabase
          .from('leads')
          .update({ status: 'lost', updated_at: new Date().toISOString() })
          .eq('id', context.leadId);

        const confirmMsg = `✓ ${context.customerName || 'Lead'} marked CLOSED`;
        await sendSMS(from, confirmMsg);

        await supabase.from('sms_log').insert({
          user_id: userId,
          direction: 'inbound',
          to_phone: process.env.TWILIO_PHONE_NUMBER!,
          from_phone: from,
          body: body,
          status: 'received',
          event_type: 'lead_update',
        });

        console.log(`Lead ${context.leadId} marked lost via SMS`);
        return twimlResponse('');
      } else {
        await sendSMS(from, 'No recent lead to update. Open the app to manage leads.');
        return twimlResponse('');
      }
    }

    // ============================================
    // NOTE: [text] - Add note to lead
    // ============================================
    const originalBody = (await request.clone().formData()).get('Body') as string;
    if (originalBody?.toUpperCase().startsWith('NOTE:') || originalBody?.toUpperCase().startsWith('NOTE ')) {
      const noteText = originalBody.substring(originalBody.indexOf(':') + 1).trim() ||
                       originalBody.substring(5).trim();

      if (!noteText) {
        await sendSMS(from, 'Please include a note after NOTE:');
        return twimlResponse('');
      }

      const context = await getAlertContext(from);

      if (context?.leadId) {
        // Get existing notes
        const { data: lead } = await supabase
          .from('leads')
          .select('notes')
          .eq('id', context.leadId)
          .single();

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
          .eq('id', context.leadId);

        const confirmMsg = `✓ Note added to ${context.customerName || 'lead'}`;
        await sendSMS(from, confirmMsg);

        await supabase.from('sms_log').insert({
          user_id: userId,
          direction: 'inbound',
          to_phone: process.env.TWILIO_PHONE_NUMBER!,
          from_phone: from,
          body: originalBody,
          status: 'received',
          event_type: 'lead_note',
        });

        console.log(`Note added to lead ${context.leadId} via SMS`);
        return twimlResponse('');
      } else {
        await sendSMS(from, 'No recent lead to add note to. Open the app to manage leads.');
        return twimlResponse('');
      }
    }

    // ============================================
    // HELP - Show available commands
    // ============================================
    if (body === 'HELP' || body === '?') {
      const helpMsg = 'Commands: OK, CALL, COMPLETE, CONTACTED, SCHEDULED, CLOSED, NOTE: [text], STOP';
      await sendSMS(from, helpMsg);

      await supabase.from('sms_log').insert({
        user_id: userId,
        direction: 'inbound',
        to_phone: process.env.TWILIO_PHONE_NUMBER!,
        from_phone: from,
        body: body,
        status: 'received',
        event_type: 'other',
      });

      return twimlResponse('');
    }

    // ============================================
    // Free text - treat as note if we have context
    // ============================================
    const context = await getAlertContext(from);
    if (context?.leadId && body.length > 3 && !['OK', 'Y', 'YES', 'CONFIRM', 'CALL', 'PHONE', 'NUMBER'].includes(body)) {
      // Treat as a note
      const { data: lead } = await supabase
        .from('leads')
        .select('notes')
        .eq('id', context.leadId)
        .single();

      const existingNotes = (lead?.notes as Array<{text: string; source: string; created_at: string}>) || [];
      const originalBodyFull = (await request.clone().formData()).get('Body') as string;
      const newNote = {
        text: originalBodyFull?.trim() || body,
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
        .eq('id', context.leadId);

      const confirmMsg = `✓ Note added to ${context.customerName || 'lead'}`;
      await sendSMS(from, confirmMsg);

      await supabase.from('sms_log').insert({
        user_id: userId,
        direction: 'inbound',
        to_phone: process.env.TWILIO_PHONE_NUMBER!,
        from_phone: from,
        body: originalBodyFull || body,
        status: 'received',
        event_type: 'lead_note',
      });

      console.log(`Free text note added to lead ${context.leadId} via SMS`);
      return twimlResponse('');
    }

    // Unknown command - log but don't respond
    console.log(`Unknown SMS command from ${from}: ${body}`);
    await supabase.from('sms_log').insert({
      user_id: userId,
      direction: 'inbound',
      to_phone: process.env.TWILIO_PHONE_NUMBER!,
      from_phone: from,
      body: body,
      status: 'received',
      event_type: 'other',
    });

    return twimlResponse('');
  } catch (error) {
    console.error('Inbound SMS error:', error);
    return twimlResponse('');
  }
}

// Return empty TwiML response
function twimlResponse(message: string) {
  const xml = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`
    : '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

  return new NextResponse(xml, {
    headers: { 'Content-Type': 'text/xml' },
  });
}

// GET for testing
export async function GET() {
  return NextResponse.json({ status: 'Twilio inbound webhook ready' });
}

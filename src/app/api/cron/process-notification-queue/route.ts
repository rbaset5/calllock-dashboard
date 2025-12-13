import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendSMS } from '@/lib/twilio';
import { isInQuietHours } from '@/lib/notification-service';

/**
 * Notification Queue Processor
 *
 * Processes queued notifications that were created during quiet hours.
 * Should be called every 5 minutes via Vercel Cron or similar.
 *
 * Flow:
 * 1. Find all queued notifications where send_at <= now
 * 2. For each notification:
 *    - Double-check quiet hours (in case they changed)
 *    - Send SMS
 *    - Update status to 'sent' or 'failed'
 *    - Log to sms_log
 */

export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Allow unauthenticated in development, require auth in production
  if (process.env.NODE_ENV === 'production' && cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
  }

  const supabase = createAdminClient();
  const now = new Date();

  try {
    // Find queued notifications ready to send
    const { data: pendingNotifications, error: fetchError } = await supabase
      .from('notification_queue')
      .select(`
        *,
        users!inner(phone, timezone)
      `)
      .eq('status', 'queued')
      .lte('send_at', now.toISOString())
      .limit(50); // Process in batches

    if (fetchError) {
      console.error('Error fetching notification queue:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch queue' },
        { status: 500 }
      );
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      return NextResponse.json({
        processed: 0,
        message: 'No pending notifications',
      });
    }

    let sent = 0;
    let failed = 0;
    let requeued = 0;

    for (const notification of pendingNotifications) {
      const user = notification.users as { phone: string | null; timezone: string };

      if (!user.phone) {
        // Mark as failed - no phone number
        await supabase
          .from('notification_queue')
          .update({
            status: 'failed',
            error_message: 'No phone number configured',
          })
          .eq('id', notification.id);
        failed++;
        continue;
      }

      // Double-check not still in quiet hours
      const quietCheck = await isInQuietHours(notification.user_id, user.timezone);

      if (quietCheck.inQuietHours && quietCheck.quietEndsAt) {
        // Re-queue for later
        await supabase
          .from('notification_queue')
          .update({
            send_at: quietCheck.quietEndsAt.toISOString(),
          })
          .eq('id', notification.id);
        requeued++;
        continue;
      }

      // Send the SMS
      const twilioSid = await sendSMS(user.phone, notification.message_body);

      if (twilioSid) {
        // Mark as sent
        await supabase
          .from('notification_queue')
          .update({
            status: 'sent',
            sent_at: now.toISOString(),
            twilio_sid: twilioSid,
          })
          .eq('id', notification.id);

        // Log to sms_log
        await supabase.from('sms_log').insert({
          job_id: notification.job_id,
          user_id: notification.user_id,
          direction: 'outbound',
          to_phone: user.phone,
          from_phone: process.env.TWILIO_PHONE_NUMBER!,
          body: notification.message_body,
          twilio_sid: twilioSid,
          status: 'sent',
          event_type: notification.event_type,
        });

        sent++;
        console.log(`Sent queued notification ${notification.id} to ${user.phone}`);
      } else {
        // Mark as failed
        await supabase
          .from('notification_queue')
          .update({
            status: 'failed',
            error_message: 'SMS send failed',
          })
          .eq('id', notification.id);
        failed++;
        console.error(`Failed to send queued notification ${notification.id}`);
      }
    }

    return NextResponse.json({
      processed: sent + failed + requeued,
      sent,
      failed,
      requeued,
    });
  } catch (error) {
    console.error('Queue processor error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

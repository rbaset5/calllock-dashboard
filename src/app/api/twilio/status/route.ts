import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Twilio Delivery Status Webhook
 *
 * Receives status updates from Twilio when SMS delivery status changes.
 * Updates the sms_log table with delivery status.
 *
 * Configure in Twilio:
 * - Go to your Twilio phone number settings
 * - Set "A MESSAGE COMES IN" webhook
 * - Set "STATUS CALLBACK URL" to this endpoint
 *
 * Status values from Twilio:
 * - queued: Message is queued for sending
 * - sending: Message is being sent
 * - sent: Message was sent to carrier
 * - delivered: Message was delivered to recipient
 * - undelivered: Message could not be delivered
 * - failed: Message failed to send
 */

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const messageSid = formData.get('MessageSid') as string;
    const messageStatus = formData.get('MessageStatus') as string;
    const errorCode = formData.get('ErrorCode') as string | null;
    const errorMessage = formData.get('ErrorMessage') as string | null;

    if (!messageSid || !messageStatus) {
      return new NextResponse('', { status: 200 }); // Acknowledge but ignore
    }

    const supabase = createAdminClient();

    // Update sms_log with delivery status
    const { error } = await supabase
      .from('sms_log')
      .update({
        delivery_status: messageStatus,
        delivery_status_updated_at: new Date().toISOString(),
      })
      .eq('twilio_sid', messageSid);

    if (error) {
      console.error('Error updating SMS delivery status:', error);
      // Still return 200 to acknowledge receipt to Twilio
    } else {
      console.log(`Updated delivery status for ${messageSid}: ${messageStatus}`);

      // Log errors for debugging
      if (errorCode || errorMessage) {
        console.warn(
          `SMS delivery issue for ${messageSid}: ${errorCode} - ${errorMessage}`
        );
      }
    }

    // Also update notification_queue if this was a queued message
    await supabase
      .from('notification_queue')
      .update({
        status: messageStatus === 'delivered' ? 'sent' :
                messageStatus === 'failed' || messageStatus === 'undelivered' ? 'failed' :
                'sent', // Default to sent for intermediate states
      })
      .eq('twilio_sid', messageSid);

    // Return 200 to acknowledge receipt
    return new NextResponse('', { status: 200 });
  } catch (error) {
    console.error('Twilio status webhook error:', error);
    // Return 200 anyway to prevent Twilio from retrying
    return new NextResponse('', { status: 200 });
  }
}

// Health check
export async function GET() {
  return NextResponse.json({ status: 'Twilio status webhook ready' });
}

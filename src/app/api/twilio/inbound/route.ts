import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendSMS, smsTemplates } from '@/lib/twilio';

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

    // Handle COMPLETE command
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
          },
          {
            job_id: job.id,
            user_id: userId,
            direction: 'outbound',
            to_phone: from,
            from_phone: process.env.TWILIO_PHONE_NUMBER!,
            body: confirmationMsg,
            status: 'sent',
          },
        ]);

        return twimlResponse('');
      } else {
        // No job found needing action
        await sendSMS(from, 'No jobs currently flagged as needing action.');
        return twimlResponse('');
      }
    }

    // Unknown command - ignore
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

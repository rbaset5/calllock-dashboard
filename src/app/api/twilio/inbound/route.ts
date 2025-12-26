import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  executeCommand,
  twimlResponse,
  logSms,
  normalizePhone,
  type CommandContext,
} from '@/lib/sms-commands';

/**
 * POST /api/twilio/inbound
 *
 * Handles inbound SMS messages from Twilio.
 * Uses command pattern to dispatch to appropriate handlers.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const bodyRaw = formData.get('Body') as string;

    if (!from || !bodyRaw) {
      return twimlResponse();
    }

    const body = bodyRaw.trim();
    const bodyUpper = body.toUpperCase();
    const supabase = createAdminClient();
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER!;

    // Normalize phone number for lookup
    const phoneWithPlus = normalizePhone(from);

    // Find user by phone number
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('phone', phoneWithPlus)
      .single();

    if (userError || !userData) {
      console.log('No user found for phone:', from);
      return twimlResponse();
    }

    const userId = userData.id;

    // Build command context
    const ctx: CommandContext = {
      from,
      body,
      bodyUpper,
      supabase,
      userId,
      twilioPhone,
    };

    // Execute the matching command
    const result = await executeCommand(ctx);

    // If no handler matched, log as unknown command
    if (!result) {
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
    }

    // Always return empty TwiML (responses are sent via sendSMS)
    return twimlResponse();
  } catch (error) {
    console.error('Inbound SMS error:', error);
    return twimlResponse();
  }
}

/**
 * GET /api/twilio/inbound
 *
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({ status: 'Twilio inbound webhook ready' });
}

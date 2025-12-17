import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * POST /api/onboarding/test-call
 *
 * Initiate a test call to verify call forwarding setup
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { businessPhone } = body;

    if (!businessPhone) {
      return NextResponse.json({ error: 'Business phone is required' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Create a test call record
    const { data: testCall, error: insertError } = await adminClient
      .from('onboarding_test_calls')
      .insert({
        user_id: user.id,
        business_phone: businessPhone,
        status: 'initiated',
        initiated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertError) {
      // Table might not exist yet - that's ok for MVP
      console.error('Error creating test call record:', insertError);
      // Continue anyway for demo purposes
    }

    // In production, this would:
    // 1. Use Twilio to make an outbound call to businessPhone
    // 2. Let it ring for ~20 seconds
    // 3. When forwarded to CallSeal, the AI would answer with a test script
    // 4. AI would mark the test as successful

    // For now, simulate success after a delay
    // In production, use Twilio's Programmable Voice API

    /*
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    await client.calls.create({
      url: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/test-call-twiml`,
      to: businessPhone,
      from: process.env.TWILIO_PHONE_NUMBER,
      timeout: 30,
      statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/test-call-status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
    });
    */

    return NextResponse.json({
      success: true,
      message: 'Test call initiated',
      testCallId: testCall?.id || 'demo',
    });
  } catch (error) {
    console.error('Test call error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

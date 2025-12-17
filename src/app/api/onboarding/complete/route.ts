import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendSMS } from '@/lib/twilio';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * POST /api/onboarding/complete
 *
 * Mark onboarding as complete and send welcome SMS
 */
export async function POST() {
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

    const adminClient = createAdminClient();

    // Mark onboarding as complete
    const { data: userData, error: updateError } = await adminClient
      .from('users')
      .update({
        onboarding_completed_at: new Date().toISOString(),
        onboarding_step: 5,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select('phone, business_name')
      .single();

    if (updateError) {
      console.error('Error completing onboarding:', updateError);
      return NextResponse.json({ error: 'Failed to complete onboarding' }, { status: 500 });
    }

    // Create default notification preferences if they don't exist
    const { error: prefError } = await adminClient
      .from('operator_notification_preferences')
      .upsert({
        user_id: user.id,
        sms_same_day_booking: true,
        sms_future_booking: true,
        sms_callback_request: true,
        sms_schedule_conflict: true,
        sms_cancellation: true,
        quiet_hours_enabled: true,
        quiet_hours_start: '21:00',
        quiet_hours_end: '07:00',
        sms_unsubscribed: false,
      }, {
        onConflict: 'user_id',
      });

    if (prefError) {
      console.error('Error creating notification preferences:', prefError);
      // Don't fail the request, just log it
    }

    // Send welcome SMS
    if (userData?.phone) {
      const welcomeMsg =
        `Welcome to CallSeal! 🎉\n\n` +
        `Your AI receptionist is now active. When you miss a call, we'll handle it and text you.\n\n` +
        `Reply HELP anytime for commands.\n\n` +
        `Good luck! - The CallSeal Team`;

      try {
        await sendSMS(userData.phone, welcomeMsg);

        // Log the welcome SMS
        await adminClient.from('sms_log').insert({
          user_id: user.id,
          direction: 'outbound',
          to_phone: userData.phone,
          from_phone: process.env.TWILIO_PHONE_NUMBER!,
          body: welcomeMsg,
          status: 'sent',
          event_type: 'system',
        });
      } catch (smsError) {
        console.error('Error sending welcome SMS:', smsError);
        // Don't fail the request, SMS is not critical
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Onboarding complete! Welcome to CallSeal.',
    });
  } catch (error) {
    console.error('Onboarding complete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

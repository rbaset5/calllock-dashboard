import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Webhook to sync call records from backend
 * Called after each call ends to sync call history to dashboard
 */

interface TranscriptMessage {
  role: 'agent' | 'user';
  content: string;
}

interface IncomingCall {
  call_id: string;
  retell_call_id?: string;
  phone_number: string;
  customer_name?: string;
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  direction?: 'inbound' | 'outbound';
  outcome?: string;
  hvac_issue_type?: string;
  urgency_tier?: string;
  problem_description?: string;
  revenue_tier_label?: string;
  revenue_tier_signals?: string[];
  transcript_object?: TranscriptMessage[];  // Structured transcript with speaker labels
  job_id?: string;
  lead_id?: string;
  user_email: string; // To find the user
}

export async function POST(request: NextRequest) {
  // Validate webhook secret
  const webhookSecret = request.headers.get('X-Webhook-Secret');
  if (webhookSecret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body: IncomingCall = await request.json();

    // Validate required fields
    if (!body.call_id || !body.phone_number || !body.user_email || !body.started_at) {
      return NextResponse.json(
        { error: 'Missing required fields: call_id, phone_number, user_email, started_at' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Find user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', body.user_email)
      .single();

    if (userError || !user) {
      console.error('User not found:', body.user_email);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check for existing call with same backend_call_id (dedup)
    const { data: existing } = await supabase
      .from('calls')
      .select('id')
      .eq('user_id', user.id)
      .eq('backend_call_id', body.call_id)
      .single();

    if (existing) {
      // Update existing call
      const { data: updated, error: updateError } = await supabase
        .from('calls')
        .update({
          ended_at: body.ended_at || null,
          duration_seconds: body.duration_seconds || null,
          outcome: body.outcome || null,
          hvac_issue_type: body.hvac_issue_type || null,
          urgency_tier: body.urgency_tier || null,
          problem_description: body.problem_description || null,
          revenue_tier_label: body.revenue_tier_label || null,
          revenue_tier_signals: body.revenue_tier_signals || null,
          transcript_object: body.transcript_object || null,
          job_id: body.job_id || null,
          lead_id: body.lead_id || null,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating call:', updateError);
        return NextResponse.json(
          { error: 'Failed to update call' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        call_id: updated.id,
        action: 'updated',
      });
    }

    // Create new call record
    const { data: call, error: callError } = await supabase
      .from('calls')
      .insert({
        user_id: user.id,
        call_id: body.call_id,
        retell_call_id: body.retell_call_id || null,
        phone_number: body.phone_number,
        customer_name: body.customer_name || null,
        started_at: body.started_at,
        ended_at: body.ended_at || null,
        duration_seconds: body.duration_seconds || null,
        direction: body.direction || 'inbound',
        outcome: body.outcome || null,
        hvac_issue_type: body.hvac_issue_type || null,
        urgency_tier: body.urgency_tier || null,
        problem_description: body.problem_description || null,
        revenue_tier_label: body.revenue_tier_label || null,
        revenue_tier_signals: body.revenue_tier_signals || null,
        transcript_object: body.transcript_object || null,
        job_id: body.job_id || null,
        lead_id: body.lead_id || null,
        synced_from_backend: true,
        backend_call_id: body.call_id,
      })
      .select()
      .single();

    if (callError || !call) {
      console.error('Error creating call:', JSON.stringify(callError, null, 2));
      console.error('Insert payload:', JSON.stringify({
        user_id: user.id,
        call_id: body.call_id,
        phone_number: body.phone_number,
      }, null, 2));
      return NextResponse.json(
        { error: 'Failed to create call', details: callError?.message },
        { status: 500 }
      );
    }

    console.log(`Call synced: ${call.id} for ${body.phone_number}`);

    return NextResponse.json({
      success: true,
      call_id: call.id,
      action: 'created',
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({ status: 'ok' });
}

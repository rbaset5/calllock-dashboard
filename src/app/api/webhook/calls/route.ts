import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateWebhookAuth } from '@/lib/middleware/webhook-auth';
import { callsWebhookSchema } from '@/lib/schemas/webhook-schemas';

/**
 * Webhook to sync call records from backend
 * Called after each call ends to sync call history to dashboard
 */

export async function POST(request: NextRequest) {
  // Validate webhook secret using middleware
  const authError = validateWebhookAuth(request);
  if (authError) return authError;

  try {
    const rawBody = await request.json();

    // Validate payload with Zod schema
    const parseResult = callsWebhookSchema.safeParse(rawBody);
    if (!parseResult.success) {
      console.error('Validation failed:', parseResult.error.issues);
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: parseResult.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }

    const body = parseResult.data;
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

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateWebhookAuth } from '@/lib/middleware/webhook-auth';
import {
  emergencyAlertsWebhookSchema,
  emergencyAlertsPatchSchema,
} from '@/lib/schemas/webhook-schemas';

/**
 * Webhook to sync emergency alerts from backend
 * Called when Tier 2 urgent alerts are sent via SMS
 */

export async function POST(request: NextRequest) {
  // Validate webhook secret using middleware
  const authError = validateWebhookAuth(request);
  if (authError) return authError;

  try {
    const rawBody = await request.json();

    // Validate payload with Zod schema
    const parseResult = emergencyAlertsWebhookSchema.safeParse(rawBody);
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

    // Calculate callback_promised_by time
    const smsSentAt = new Date(body.sms_sent_at);
    const callbackPromisedBy = new Date(
      smsSentAt.getTime() + (body.callback_promised_minutes || 15) * 60 * 1000
    );

    // Generate alert_id if not provided
    const alertId = body.alert_id || `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Check for existing alert with same backend_alert_id (dedup)
    if (body.alert_id) {
      const { data: existing } = await supabase
        .from('emergency_alerts')
        .select('id')
        .eq('user_id', user.id)
        .eq('backend_alert_id', body.alert_id)
        .single();

      if (existing) {
        // Update existing alert
        const { data: updated, error: updateError } = await supabase
          .from('emergency_alerts')
          .update({
            customer_name: body.customer_name || null,
            customer_address: body.customer_address || null,
            problem_description: body.problem_description,
            sms_message_sid: body.sms_message_sid || null,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating alert:', updateError);
          return NextResponse.json(
            { error: 'Failed to update alert' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          alert_id: updated.id,
          action: 'updated',
        });
      }
    }

    // Create new alert record
    const { data: alert, error: alertError } = await supabase
      .from('emergency_alerts')
      .insert({
        user_id: user.id,
        alert_id: alertId,
        call_id: body.call_id || null,
        phone_number: body.phone_number,
        customer_name: body.customer_name || null,
        customer_address: body.customer_address || null,
        urgency_tier: body.urgency_tier || 'Urgent',
        problem_description: body.problem_description,
        sms_sent_at: body.sms_sent_at,
        sms_message_sid: body.sms_message_sid || null,
        callback_promised_by: callbackPromisedBy.toISOString(),
        callback_status: 'pending',
        synced_from_backend: true,
        backend_alert_id: body.alert_id || alertId,
      })
      .select()
      .single();

    if (alertError || !alert) {
      console.error('Error creating alert:', alertError);
      return NextResponse.json(
        { error: 'Failed to create alert' },
        { status: 500 }
      );
    }

    console.log(`Emergency alert synced: ${alert.id} for ${body.phone_number}`);

    return NextResponse.json({
      success: true,
      alert_id: alert.id,
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

/**
 * PATCH - Update alert status (callback delivered, resolved, etc.)
 */
export async function PATCH(request: NextRequest) {
  // Validate webhook secret using middleware
  const authError = validateWebhookAuth(request);
  if (authError) return authError;

  try {
    const rawBody = await request.json();

    // Validate payload with Zod schema
    const parseResult = emergencyAlertsPatchSchema.safeParse(rawBody);
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

    const updates: Record<string, unknown> = {};

    if (body.callback_status) updates.callback_status = body.callback_status;
    if (body.callback_delivered_at) updates.callback_delivered_at = body.callback_delivered_at;
    if (body.resolved_at) updates.resolved_at = body.resolved_at;
    if (body.resolution_notes) updates.resolution_notes = body.resolution_notes;
    if (body.converted_to_job_id) updates.converted_to_job_id = body.converted_to_job_id;
    if (body.converted_to_lead_id) updates.converted_to_lead_id = body.converted_to_lead_id;

    let query = supabase.from('emergency_alerts').update(updates);

    if (body.alert_id) {
      query = query.eq('id', body.alert_id);
    } else {
      query = query.eq('backend_alert_id', body.backend_alert_id);
    }

    const { data: updated, error: updateError } = await query.select().single();

    if (updateError) {
      console.error('Error updating alert:', updateError);
      return NextResponse.json(
        { error: 'Failed to update alert' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      alert_id: updated.id,
      action: 'updated',
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

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Webhook to sync emergency alerts from backend
 * Called when Tier 2 urgent alerts are sent via SMS
 */

interface IncomingAlert {
  alert_id?: string;
  call_id?: string;
  phone_number: string;
  customer_name?: string;
  customer_address?: string;
  urgency_tier?: string;
  problem_description: string;
  sms_sent_at: string;
  sms_message_sid?: string;
  callback_promised_minutes: number; // Minutes until promised callback
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
    const body: IncomingAlert = await request.json();

    // Validate required fields
    if (!body.phone_number || !body.problem_description || !body.user_email || !body.sms_sent_at) {
      return NextResponse.json(
        { error: 'Missing required fields: phone_number, problem_description, user_email, sms_sent_at' },
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
  // Validate webhook secret
  const webhookSecret = request.headers.get('X-Webhook-Secret');
  if (webhookSecret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();

    if (!body.alert_id && !body.backend_alert_id) {
      return NextResponse.json(
        { error: 'Missing alert_id or backend_alert_id' },
        { status: 400 }
      );
    }

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

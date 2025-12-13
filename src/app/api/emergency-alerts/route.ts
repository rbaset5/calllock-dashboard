import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/emergency-alerts
 * Returns emergency alerts with optional filtering
 * Query params:
 *   - status: pending | delivered | expired | no_answer
 *   - phone: filter by phone number
 *   - limit: number of results (default 20)
 *   - offset: pagination offset (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const phone = searchParams.get('phone');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let query = supabase
      .from('emergency_alerts')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('sms_sent_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by callback status
    if (status) {
      query = query.eq('callback_status', status);
    }

    // Filter by phone number
    if (phone) {
      const normalizedPhone = phone.replace(/\D/g, '');
      query = query.or(`phone_number.ilike.%${normalizedPhone}%,phone_number.ilike.%${phone}%`);
    }

    const { data: alerts, error, count } = await query;

    if (error) {
      console.error('Error fetching alerts:', error);
      return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
    }

    // Calculate metrics
    const now = new Date();
    const metrics = {
      total: count || 0,
      pending: 0,
      delivered: 0,
      expired: 0,
      overdue: 0, // Pending but past promised callback time
    };

    if (alerts) {
      for (const alert of alerts) {
        if (alert.callback_status === 'pending') {
          metrics.pending++;
          if (new Date(alert.callback_promised_by) < now) {
            metrics.overdue++;
          }
        } else if (alert.callback_status === 'delivered') {
          metrics.delivered++;
        } else if (alert.callback_status === 'expired') {
          metrics.expired++;
        }
      }
    }

    return NextResponse.json({
      alerts: alerts || [],
      metrics,
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/emergency-alerts
 * Update alert status (mark callback delivered, resolved, etc.)
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (!body.alert_id) {
      return NextResponse.json({ error: 'Missing alert_id' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};

    if (body.callback_status) updates.callback_status = body.callback_status;
    if (body.callback_delivered_at) updates.callback_delivered_at = body.callback_delivered_at;
    if (body.resolved_at) updates.resolved_at = body.resolved_at;
    if (body.resolution_notes) updates.resolution_notes = body.resolution_notes;

    const { data: updated, error: updateError } = await supabase
      .from('emergency_alerts')
      .update(updates)
      .eq('id', body.alert_id)
      .eq('user_id', user.id) // Ensure user owns this alert
      .select()
      .single();

    if (updateError) {
      console.error('Error updating alert:', updateError);
      return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 });
    }

    return NextResponse.json({ success: true, alert: updated });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

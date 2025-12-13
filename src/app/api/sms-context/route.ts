import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * SMS Context API
 *
 * Called by the CallLock server after sending an SMS alert to save context.
 * This allows the inbound SMS handler to match replies to the correct lead/job.
 */

interface SmsContextRequest {
  operator_phone: string;
  alert_type: 'emergency' | 'sales_lead';
  customer_phone: string;
  customer_name?: string;
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
    const body: SmsContextRequest = await request.json();

    // Validate required fields
    if (!body.operator_phone || !body.alert_type || !body.customer_phone) {
      return NextResponse.json(
        { error: 'Missing required fields: operator_phone, alert_type, customer_phone' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Normalize phone numbers
    const operatorPhone = normalizePhone(body.operator_phone);
    const customerPhone = normalizePhone(body.customer_phone);

    // Try to find a recent lead by customer phone
    // Look for leads created in the last hour (most likely the one we just created)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: lead } = await supabase
      .from('leads')
      .select('id, customer_name')
      .eq('customer_phone', customerPhone)
      .gte('created_at', oneHourAgo)
      .not('status', 'in', '("converted","lost")')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Try to find a recent job if no lead found
    let jobId: string | null = null;
    let customerId: string | null = null;

    if (!lead) {
      const { data: job } = await supabase
        .from('jobs')
        .select('id, customer_id')
        .eq('customer_phone', customerPhone)
        .gte('created_at', oneHourAgo)
        .not('status', 'in', '("complete","cancelled")')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (job) {
        jobId = job.id;
        customerId = job.customer_id;
      }
    }

    // If still no match, try to find customer by phone
    if (!lead && !jobId) {
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', customerPhone)
        .limit(1)
        .single();

      if (customer) {
        customerId = customer.id;
      }
    }

    // Save the context
    const { data: context, error: insertError } = await supabase
      .from('sms_alert_context')
      .insert({
        operator_phone: operatorPhone,
        alert_type: body.alert_type,
        lead_id: lead?.id || null,
        customer_id: customerId,
        job_id: jobId,
        customer_phone: customerPhone,
        customer_name: body.customer_name || lead?.customer_name || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error saving SMS context:', insertError);
      return NextResponse.json(
        { error: 'Failed to save context' },
        { status: 500 }
      );
    }

    console.log(`SMS context saved: ${context.id} for ${body.alert_type} alert, lead=${lead?.id || 'none'}`);

    return NextResponse.json({
      success: true,
      context_id: context.id,
      lead_id: lead?.id || null,
      job_id: jobId,
      customer_id: customerId,
    });
  } catch (error) {
    console.error('SMS context API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Normalize phone number to E.164 format
 */
function normalizePhone(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');

  // Add +1 prefix if needed
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // Already has + or other format
  return phone.startsWith('+') ? phone : `+${digits}`;
}

// Health check
export async function GET() {
  return NextResponse.json({ status: 'SMS context API ready' });
}

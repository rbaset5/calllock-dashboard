import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendOperatorNotification, isScheduledToday } from '@/lib/notification-service';
import { formatServiceTypeForSms } from '@/lib/twilio';

/**
 * Job Status Change Webhook
 *
 * Triggered when a job status changes. Currently handles:
 * - Same-day cancellations: Sends SMS notification to operator
 *
 * This can be called from:
 * 1. Client-side after status update
 * 2. Supabase database trigger (future)
 */

interface StatusChangeRequest {
  job_id: string;
  previous_status: string;
  new_status: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: StatusChangeRequest = await request.json();

    // Validate required fields
    if (!body.job_id || !body.new_status) {
      return NextResponse.json(
        { error: 'Missing required fields: job_id and new_status' },
        { status: 400 }
      );
    }

    // Only process cancellations for now
    if (body.new_status !== 'cancelled') {
      return NextResponse.json({
        skip: true,
        reason: 'Only processing cancellation events',
      });
    }

    const supabase = createAdminClient();

    // Get job details with user info
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select(`
        id,
        customer_name,
        customer_phone,
        customer_address,
        service_type,
        scheduled_at,
        user_id,
        users!inner(id, phone, timezone)
      `)
      .eq('id', body.job_id)
      .single();

    if (jobError || !job) {
      console.error('Job not found:', jobError);
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Type assertion for joined user data (Supabase returns single object with !inner join)
    const user = job.users as unknown as { id: string; phone: string | null; timezone: string };

    // Check if this is a same-day cancellation
    if (!job.scheduled_at) {
      return NextResponse.json({
        skip: true,
        reason: 'Job has no scheduled time',
      });
    }

    const isSameDay = isScheduledToday(job.scheduled_at, user.timezone);

    if (!isSameDay) {
      return NextResponse.json({
        skip: true,
        reason: 'Not a same-day cancellation',
      });
    }

    // Send cancellation notification
    if (!user.phone) {
      return NextResponse.json({
        skip: true,
        reason: 'User has no phone number configured',
      });
    }

    const notificationResult = await sendOperatorNotification(
      user.id,
      job.id,
      'cancellation',
      {
        customerName: job.customer_name,
        customerPhone: job.customer_phone,
        scheduledAt: job.scheduled_at,
        serviceType: formatServiceTypeForSms(job.service_type),
        address: job.customer_address,
      },
      user.phone,
      user.timezone
    );

    console.log(`Cancellation notification for job ${job.id}:`, notificationResult);

    return NextResponse.json({
      success: true,
      notification: notificationResult,
    });
  } catch (error) {
    console.error('Job status webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({ status: 'Job status webhook ready' });
}

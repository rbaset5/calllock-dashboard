import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatServiceTypeForSms } from '@/lib/twilio';
import {
  sendOperatorNotification,
  determineEventType,
  checkScheduleConflicts,
  NotificationEventType,
} from '@/lib/notification-service';

// Request body type
interface IncomingJob {
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  service_type: 'hvac' | 'plumbing' | 'electrical' | 'general';
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  ai_summary?: string;
  scheduled_at?: string; // ISO 8601
  call_transcript?: string;
  user_email: string; // To find the user
  // Revenue estimation fields (from CallLock server)
  estimated_value?: number;
  estimated_revenue_low?: number;
  estimated_revenue_high?: number;
  estimated_revenue_display?: string;
  revenue_confidence?: 'low' | 'medium' | 'high';
  revenue_factors?: string[];
  potential_replacement?: boolean;
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
    const body: IncomingJob = await request.json();

    // Validate required fields
    if (
      !body.customer_name ||
      !body.customer_phone ||
      !body.customer_address ||
      !body.service_type ||
      !body.urgency ||
      !body.user_email
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Find user by email
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('id, phone, timezone')
      .eq('email', body.user_email)
      .single();

    // If user not found, try to find them in Supabase Auth and create a profile
    if (userError || !user) {
      console.log(`User not found by email: ${body.user_email}, attempting to find in auth...`);

      // Look up user in Supabase Auth by email
      const { data: authData } = await supabase.auth.admin.listUsers();
      const authUser = authData?.users?.find(u => u.email === body.user_email);

      if (authUser) {
        // Create user profile
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            id: authUser.id,
            email: body.user_email,
            business_name: 'My Business',
            timezone: 'America/New_York',
          })
          .select('id, phone, timezone')
          .single();

        if (createError) {
          console.error('Error creating user profile:', createError);
          return NextResponse.json(
            { error: 'Failed to create user profile' },
            { status: 500 }
          );
        }

        user = newUser;
        console.log(`Created user profile for: ${body.user_email}`);
      } else {
        console.error(`User not found in auth: ${body.user_email}`);
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
    }

    // Check for schedule conflicts before creating the job
    let hasConflict = false;
    let conflictingJob: { customer_name: string; scheduled_at: string } | undefined;

    if (body.scheduled_at) {
      const conflictCheck = await checkScheduleConflicts(user.id, body.scheduled_at);
      hasConflict = conflictCheck.hasConflict;
      conflictingJob = conflictCheck.conflictingJob;
    }

    // Create the job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        customer_name: body.customer_name,
        customer_phone: body.customer_phone,
        customer_address: body.customer_address,
        service_type: body.service_type,
        urgency: body.urgency,
        ai_summary: body.ai_summary || null,
        scheduled_at: body.scheduled_at || null,
        call_transcript: body.call_transcript || null,
        estimated_value: body.estimated_value || null,
        status: 'new',
        needs_action: hasConflict, // Flag for review if there's a conflict
        is_ai_booked: true,
      })
      .select()
      .single();

    if (jobError || !job) {
      console.error('Error creating job:', jobError);
      return NextResponse.json(
        { error: 'Failed to create job' },
        { status: 500 }
      );
    }

    // Send notification using the new notification service
    let notificationResult = null;
    if (user.phone) {
      // Determine the event type based on scheduling
      const eventType: NotificationEventType = determineEventType(
        body.scheduled_at,
        user.timezone,
        hasConflict
      );

      // Build notification data
      const notificationData = {
        customerName: job.customer_name,
        customerPhone: job.customer_phone,
        scheduledAt: job.scheduled_at,
        serviceType: formatServiceTypeForSms(job.service_type),
        address: job.customer_address,
        conflictingJobName: conflictingJob?.customer_name,
        conflictingJobTime: conflictingJob?.scheduled_at,
      };

      // Send or queue notification
      notificationResult = await sendOperatorNotification(
        user.id,
        job.id,
        eventType,
        notificationData,
        user.phone,
        user.timezone
      );

      console.log(`Notification result for job ${job.id}:`, notificationResult);
    }

    return NextResponse.json({
      success: true,
      job_id: job.id,
      notification: notificationResult,
      conflict_detected: hasConflict,
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

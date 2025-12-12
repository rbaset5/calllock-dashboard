import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatServiceTypeForSms } from '@/lib/twilio';
import {
  sendOperatorNotification,
  determineEventType,
  checkScheduleConflicts,
  NotificationEventType,
} from '@/lib/notification-service';
import { findOrCreateCustomer } from '@/lib/customers';

// EndCallReason from server - determines if this should be a Lead vs Job
type EndCallReason =
  | 'wrong_number'
  | 'callback_later'
  | 'safety_emergency'
  | 'urgent_escalation'
  | 'out_of_area'
  | 'waitlist_added'
  | 'completed'
  | 'customer_hangup'
  | 'sales_lead'
  | 'cancelled'
  | 'rescheduled';

// Lead status mapping from EndCallReason
type LeadStatus =
  | 'callback_requested'
  | 'thinking'
  | 'voicemail_left'
  | 'info_only'
  | 'deferred'
  | 'converted'
  | 'lost'
  | 'abandoned'
  | 'sales_opportunity';

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
  // Call outcome for Lead creation (when no booking)
  end_call_reason?: EndCallReason;
  issue_description?: string;
  // Sales lead specific fields
  equipment_type?: string;
  equipment_age?: string;
  sales_lead_notes?: string;
}

/**
 * Map EndCallReason to LeadStatus
 * Determines what type of lead to create based on how the call ended
 */
function mapEndCallReasonToLeadStatus(reason?: EndCallReason): LeadStatus | null {
  if (!reason) return null;

  switch (reason) {
    case 'customer_hangup':
      return 'abandoned'; // Customer hung up - needs immediate callback
    case 'callback_later':
      return 'callback_requested'; // Customer wants callback
    case 'sales_lead':
      return 'sales_opportunity'; // Sales/replacement inquiry - high priority
    case 'out_of_area':
      return 'lost'; // Out of service area - mark as lost
    case 'wrong_number':
      return null; // Don't create a lead for wrong numbers
    case 'completed':
      return null; // Completed calls become Jobs, not Leads
    case 'safety_emergency':
    case 'urgent_escalation':
      return null; // These should still be Jobs (even without scheduled_at)
    case 'waitlist_added':
      return 'deferred'; // On waitlist - check back later
    case 'cancelled':
    case 'rescheduled':
      return null; // These are appointment changes, not new leads
    default:
      return 'info_only'; // Default to info_only for unknown reasons
  }
}

/**
 * Map LeadStatus to LeadPriority
 */
function mapLeadStatusToPriority(status: LeadStatus): 'hot' | 'warm' | 'cold' {
  switch (status) {
    case 'abandoned':
    case 'callback_requested':
    case 'sales_opportunity':
      return 'hot'; // Needs immediate attention - sales leads are high priority
    case 'thinking':
    case 'voicemail_left':
      return 'warm'; // Follow up soon
    case 'info_only':
    case 'deferred':
    case 'lost':
    case 'converted':
    default:
      return 'cold';
  }
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

    // Determine if this should be a Lead instead of a Job
    // Create Lead if: no scheduled_at AND end_call_reason maps to a lead status
    const leadStatus = mapEndCallReasonToLeadStatus(body.end_call_reason);
    const shouldCreateLead = !body.scheduled_at && leadStatus !== null;

    if (shouldCreateLead) {
      // Create a Lead for non-booking calls
      const priority = mapLeadStatusToPriority(leadStatus);

      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .insert({
          user_id: user.id,
          customer_name: body.customer_name,
          customer_phone: body.customer_phone,
          customer_address: body.customer_address,
          status: leadStatus,
          priority,
          why_not_booked: body.ai_summary || null,
          issue_description: body.issue_description || body.ai_summary || null,
          service_type: body.service_type,
          urgency: body.urgency,
          estimated_value: body.estimated_value || null,
          call_transcript: body.call_transcript || null,
          ai_summary: body.ai_summary || null,
        })
        .select()
        .single();

      if (leadError || !lead) {
        console.error('Error creating lead:', leadError);
        return NextResponse.json(
          { error: 'Failed to create lead' },
          { status: 500 }
        );
      }

      // Send notification for abandoned calls (hot leads)
      let notificationResult = null;
      if (user.phone && leadStatus === 'abandoned') {
        // Send abandoned_call notification
        notificationResult = await sendOperatorNotification(
          user.id,
          lead.id,
          'abandoned_call' as NotificationEventType,
          {
            customerName: lead.customer_name,
            customerPhone: lead.customer_phone,
            address: lead.customer_address,
          },
          user.phone,
          user.timezone
        );
        console.log(`Notification result for abandoned lead ${lead.id}:`, notificationResult);
      }

      return NextResponse.json({
        success: true,
        lead_id: lead.id,
        type: 'lead',
        status: leadStatus,
        notification: notificationResult,
      });
    }

    // Create a Job for booking calls
    // Check for schedule conflicts before creating the job
    let hasConflict = false;
    let conflictingJob: { customer_name: string; scheduled_at: string } | undefined;

    if (body.scheduled_at) {
      const conflictCheck = await checkScheduleConflicts(user.id, body.scheduled_at);
      hasConflict = conflictCheck.hasConflict;
      conflictingJob = conflictCheck.conflictingJob;
    }

    // Find or create customer record
    const customerId = await findOrCreateCustomer(supabase, user.id, {
      name: body.customer_name,
      phone: body.customer_phone,
      address: body.customer_address,
    });

    // Create the job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        customer_id: customerId,
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
      type: 'job',
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

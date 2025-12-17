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
import { formatScheduleTime } from '@/lib/format';

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
  // Revenue estimation fields (from CallSeal server)
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
  // Revenue tier classification (from CallSeal server)
  revenue_tier?: 'replacement' | 'major_repair' | 'standard_repair' | 'minor' | 'diagnostic';
  revenue_tier_label?: '$$$$' | '$$$' | '$$' | '$' | '$$?';
  revenue_tier_signals?: string[];
  // Extended revenue tier fields
  revenue_tier_description?: string;
  revenue_tier_range?: string;
  // Diagnostic context fields
  problem_duration?: string;
  problem_onset?: string;
  problem_pattern?: string;
  customer_attempted_fixes?: string;
  // Call tracking - links to original call record
  call_id?: string;
  // V3 Triage Engine fields
  caller_type?: 'residential' | 'commercial' | 'vendor' | 'recruiting' | 'unknown';
  primary_intent?: 'new_lead' | 'active_job_issue' | 'booking_request' | 'admin_billing' | 'solicitation';
  booking_status?: 'confirmed' | 'attempted_failed' | 'not_requested';
  is_callback_complaint?: boolean;
  // V3 Status Color and Archive fields
  status_color?: 'red' | 'green' | 'blue' | 'gray';
  is_archived?: boolean;
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
 * Priority boost for commercial callers and callback complaints
 */
function mapLeadStatusToPriority(
  status: LeadStatus,
  callerType?: string,
  isCallbackComplaint?: boolean
): 'hot' | 'warm' | 'cold' {
  // Commercial callers = hot (business customers are valuable)
  if (callerType === 'commercial') return 'hot';
  // Callback complaints = hot (service issues need immediate attention)
  if (isCallbackComplaint) return 'hot';

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
      const priority = mapLeadStatusToPriority(leadStatus, body.caller_type, body.is_callback_complaint);

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
          // Revenue tier fields
          revenue_tier: body.revenue_tier || null,
          revenue_tier_label: body.revenue_tier_label || null,
          revenue_tier_signals: body.revenue_tier_signals || null,
          // Extended revenue tier fields
          revenue_confidence: body.revenue_confidence || null,
          revenue_tier_description: body.revenue_tier_description || null,
          revenue_tier_range: body.revenue_tier_range || null,
          // Diagnostic context fields
          problem_duration: body.problem_duration || null,
          problem_onset: body.problem_onset || null,
          problem_pattern: body.problem_pattern || null,
          customer_attempted_fixes: body.customer_attempted_fixes || null,
          // Sales lead info
          sales_lead_notes: body.sales_lead_notes || null,
          equipment_type: body.equipment_type || null,
          equipment_age: body.equipment_age || null,
          // Call tracking - links lead to original call record
          original_call_id: body.call_id || null,
          // Preserve original end call reason for granular status display
          // end_call_reason: body.end_call_reason || null,
          // V3 Triage Engine fields
          caller_type: body.caller_type || null,
          primary_intent: body.primary_intent || null,
          booking_status: body.booking_status || null,
          is_callback_complaint: body.is_callback_complaint || false,
          // V3 Status color and archive
          status_color: body.status_color || 'blue',
          is_archived: body.is_archived || false,
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
          null, // No job ID for leads
          'abandoned_call' as NotificationEventType,
          {
            customerName: lead.customer_name,
            customerPhone: lead.customer_phone,
            address: lead.customer_address,
          },
          user.phone,
          user.timezone,
          { leadId: lead.id } // Pass lead ID for SMS reply tracking
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

    // Build needs_action_note if there's a schedule conflict
    let needsActionNote: string | null = null;
    if (hasConflict && conflictingJob) {
      const conflictTime = formatScheduleTime(conflictingJob.scheduled_at, user.timezone || 'America/New_York');
      needsActionNote = `Schedule conflict with ${conflictingJob.customer_name} at ${conflictTime}`;
    }

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
        needs_action_note: needsActionNote, // Explain why it needs action
        is_ai_booked: true,
        // Revenue tier fields
        revenue_tier: body.revenue_tier || null,
        revenue_tier_label: body.revenue_tier_label || null,
        revenue_tier_signals: body.revenue_tier_signals || null,
        // Extended revenue tier fields
        revenue_confidence: body.revenue_confidence || null,
        revenue_tier_description: body.revenue_tier_description || null,
        revenue_tier_range: body.revenue_tier_range || null,
        // Diagnostic context fields
        problem_duration: body.problem_duration || null,
        problem_onset: body.problem_onset || null,
        problem_pattern: body.problem_pattern || null,
        customer_attempted_fixes: body.customer_attempted_fixes || null,
        // V3 Status color (jobs don't get archived)
        status_color: body.status_color || null,
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

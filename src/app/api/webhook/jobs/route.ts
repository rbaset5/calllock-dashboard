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
import { validateWebhookAuth } from '@/lib/middleware/webhook-auth';
import {
  jobsWebhookSchema,
  type JobsWebhookPayload,
} from '@/lib/schemas/webhook-schemas';

// EndCallReason from server - determines if this should be a Lead vs Job
type EndCallReason = NonNullable<JobsWebhookPayload['end_call_reason']>;

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

/**
 * Map EndCallReason to LeadStatus
 * Determines what type of lead to create based on how the call ended
 */
function mapEndCallReasonToLeadStatus(reason?: EndCallReason): LeadStatus | null {
  // If no explicit reason, treat as abandoned (early exit, audio issues, etc.)
  // This ensures we capture leads from calls that ended unexpectedly
  if (!reason) return 'abandoned';

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

/**
 * Extract equipment age from issue description text.
 * Matches: "10 years old", "15 year old", "about 20 years", "system is 10 years"
 */
function extractEquipmentAge(text: string | undefined | null): string | null {
  if (!text) return null;

  const patterns = [
    /(\d{1,2})\s*(?:years?)\s*old/i,
    /about\s*(\d{1,2})\s*(?:years?)/i,
    /(?:system|unit|equipment)\s*is\s*(\d{1,2})\s*(?:years?)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const age = parseInt(match[1], 10);
      if (age >= 0 && age <= 50) {
        return `${age} years`;
      }
    }
  }
  return null;
}

/**
 * Determine priority color based on property type and other signals.
 * Commercial properties get GREEN (high value).
 * This overrides the backend-provided status_color when property_type is set.
 */
function determinePriorityColor(
  propertyType: string | undefined | null,
  statusColor: string | undefined | null,
  systemStatus: string | undefined | null
): 'red' | 'green' | 'blue' | 'gray' {
  // Commercial properties always get GREEN priority (high value)
  if (propertyType === 'commercial') {
    return 'green';
  }

  // System completely down could be escalated to high priority
  // But we'll let existing logic handle urgency escalation

  // Default to provided status_color or 'blue'
  if (statusColor === 'red' || statusColor === 'green' || statusColor === 'blue' || statusColor === 'gray') {
    return statusColor;
  }

  return 'blue';
}

/**
 * Extract equipment type from issue description text.
 * Matches: "AC", "furnace", "heat pump", "water heater", etc.
 */
function extractEquipmentType(text: string | undefined | null): string | null {
  if (!text) return null;

  const patterns = [
    { regex: /\b(central\s*)?a\/?c\b|\bair\s*condition(er|ing)?\b/i, type: 'AC Unit' },
    { regex: /\bheat(ing)?\s*(pump|system)\b/i, type: 'Heat Pump' },
    { regex: /\bfurnace\b/i, type: 'Furnace' },
    { regex: /\bwater\s*heater\b/i, type: 'Water Heater' },
    { regex: /\bboiler\b/i, type: 'Boiler' },
    { regex: /\bthermosta?t\b/i, type: 'Thermostat' },
    { regex: /\bduct(work|s)?\b/i, type: 'Ductwork' },
    { regex: /\bcompressor\b/i, type: 'Compressor' },
    { regex: /\bhandler\b|\bair\s*handler\b/i, type: 'Air Handler' },
    { regex: /\bmini[\s-]?split\b/i, type: 'Mini Split' },
    { regex: /\bHVAC\b/i, type: 'HVAC System' },
  ];

  for (const { regex, type } of patterns) {
    if (regex.test(text)) return type;
  }
  return null;
}

export async function POST(request: NextRequest) {
  // Validate webhook secret using middleware
  const authError = validateWebhookAuth(request);
  if (authError) return authError;

  try {
    const rawBody = await request.json();

    // Validate payload with Zod schema
    const parseResult = jobsWebhookSchema.safeParse(rawBody);
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

      // Check for existing lead with same call_id (deduplication)
      if (body.call_id) {
        const { data: existingLead } = await supabase
          .from('leads')
          .select('id')
          .eq('user_id', user.id)
          .eq('original_call_id', body.call_id)
          .single();

        if (existingLead) {
          // Update existing lead instead of creating duplicate
          const { data: updatedLead, error: updateError } = await supabase
            .from('leads')
            .update({
              customer_name: body.customer_name,
              customer_phone: body.customer_phone,
              customer_address: body.customer_address,
              status: leadStatus,
              priority,
              why_not_booked: body.ai_summary || null,
              issue_description: body.issue_description || body.ai_summary || null,
              ai_summary: body.ai_summary || null,
              call_transcript: body.call_transcript || null,
              revenue_tier: body.revenue_tier || null,
              revenue_tier_label: body.revenue_tier_label || null,
              revenue_tier_signals: body.revenue_tier_signals || null,
              equipment_type: body.equipment_type || extractEquipmentType(body.issue_description),
              equipment_age: body.equipment_age || extractEquipmentAge(body.issue_description),
              // V5 Velocity Enhancements
              sentiment_score: body.sentiment_score ?? undefined,
              work_type: body.work_type ?? undefined,
              // HVAC Must-Have Fields
              property_type: body.property_type ?? undefined,
              system_status: body.system_status ?? undefined,
              equipment_age_bracket: body.equipment_age_bracket ?? undefined,
              is_decision_maker: body.is_decision_maker ?? undefined,
              decision_maker_contact: body.decision_maker_contact ?? undefined,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingLead.id)
            .select()
            .single();

          if (updateError) {
            console.error('Error updating existing lead:', updateError);
            return NextResponse.json(
              { error: 'Failed to update lead' },
              { status: 500 }
            );
          }

          console.log(`Updated existing lead ${existingLead.id} for call ${body.call_id}`);
          return NextResponse.json({
            success: true,
            lead_id: updatedLead!.id,
            type: 'lead',
            status: leadStatus,
            action: 'updated',
          });
        }
      }

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
          equipment_type: body.equipment_type || extractEquipmentType(body.issue_description),
          equipment_age: body.equipment_age || extractEquipmentAge(body.issue_description),
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
          // V4 Priority color (with commercial property override)
          priority_color: determinePriorityColor(body.property_type, body.status_color, body.system_status),
          priority_reason: body.property_type === 'commercial' ? 'Commercial property - high value' : null,
          // V5 Velocity Enhancements
          sentiment_score: body.sentiment_score ?? null,
          work_type: body.work_type ?? null,
          // HVAC Must-Have Fields
          property_type: body.property_type ?? null,
          system_status: body.system_status ?? null,
          equipment_age_bracket: body.equipment_age_bracket ?? null,
          is_decision_maker: body.is_decision_maker ?? null,
          decision_maker_contact: body.decision_maker_contact ?? null,
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

      // Send extra notification for commercial properties (high value)
      // Commercial properties are flagged with priority_color: 'green' and will show in dashboard
      // The sales_lead notification template works well for commercial property alerts
      if (user.phone && body.property_type === 'commercial') {
        const commercialNotification = await sendOperatorNotification(
          user.id,
          null,
          'sales_lead' as NotificationEventType, // Reuse sales_lead event type
          {
            customerName: `🏢 ${lead.customer_name} (Commercial)`,
            customerPhone: lead.customer_phone,
            address: lead.customer_address,
          },
          user.phone,
          user.timezone,
          { leadId: lead.id }
        );
        console.log(`Commercial notification result for lead ${lead.id}:`, commercialNotification);
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

    // Check for existing job with same call_id (deduplication)
    // Note: original_call_id column must exist in jobs table (migration 0020)
    if (body.call_id) {
      try {
        const { data: existingJob } = await supabase
          .from('jobs')
          .select('id, scheduled_at')
          .eq('user_id', user.id)
          .eq('original_call_id', body.call_id)
          .single();

        if (existingJob) {
          // Update existing job instead of creating duplicate
          // Preserve existing scheduled_at if incoming payload doesn't have one
          const { data: updatedJob, error: updateError } = await supabase
            .from('jobs')
            .update({
              customer_name: body.customer_name,
              customer_phone: body.customer_phone,
              customer_address: body.customer_address,
              ai_summary: body.ai_summary || null,
              scheduled_at: body.scheduled_at ?? existingJob.scheduled_at,
              call_transcript: body.call_transcript || null,
              revenue_tier: body.revenue_tier || null,
              revenue_tier_label: body.revenue_tier_label || null,
              revenue_tier_signals: body.revenue_tier_signals || null,
              // V5 Velocity Enhancements
              sentiment_score: body.sentiment_score ?? undefined,
              work_type: body.work_type ?? undefined,
              // HVAC Must-Have Fields
              property_type: body.property_type ?? undefined,
              system_status: body.system_status ?? undefined,
              equipment_age_bracket: body.equipment_age_bracket ?? undefined,
              is_decision_maker: body.is_decision_maker ?? undefined,
              decision_maker_contact: body.decision_maker_contact ?? undefined,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingJob.id)
            .select()
            .single();

          if (updateError) {
            console.error('Error updating existing job:', updateError);
            return NextResponse.json(
              { error: 'Failed to update job' },
              { status: 500 }
            );
          }

          console.log(`Updated existing job ${existingJob.id} for call ${body.call_id}`);
          return NextResponse.json({
            success: true,
            job_id: updatedJob!.id,
            type: 'job',
            action: 'updated',
            conflict_detected: hasConflict,
          });
        }
      } catch {
        // original_call_id column may not exist yet - proceed with insert
        console.log('Job deduplication skipped - column may not exist yet');
      }
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
        // Call tracking for deduplication (migration 0020)
        original_call_id: body.call_id || null,
        // V5 Velocity Enhancements
        sentiment_score: body.sentiment_score ?? null,
        work_type: body.work_type ?? null,
        // V4 Priority color (with commercial property override)
        priority_color: determinePriorityColor(body.property_type, body.status_color, body.system_status),
        priority_reason: body.property_type === 'commercial' ? 'Commercial property - high value' : null,
        // HVAC Must-Have Fields
        property_type: body.property_type ?? null,
        system_status: body.system_status ?? null,
        equipment_age_bracket: body.equipment_age_bracket ?? null,
        is_decision_maker: body.is_decision_maker ?? null,
        decision_maker_contact: body.decision_maker_contact ?? null,
      })
      .select()
      .single();

    if (jobError || !job) {
      console.error('Error creating job:', JSON.stringify(jobError, null, 2));
      return NextResponse.json(
        { error: 'Failed to create job', details: jobError?.message },
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

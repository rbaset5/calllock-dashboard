import { z } from 'zod';

// ============================================
// Shared Enums and Types
// ============================================

export const endCallReasonSchema = z.enum([
  'wrong_number',
  'callback_later',
  'safety_emergency',
  'urgent_escalation',
  'out_of_area',
  'waitlist_added',
  'completed',
  'customer_hangup',
  'sales_lead',
  'cancelled',
  'rescheduled',
]);

export const serviceTypeSchema = z.enum(['hvac', 'plumbing', 'electrical', 'general']);

export const urgencySchema = z.enum(['low', 'medium', 'high', 'emergency']);

export const revenueTierSchema = z.enum([
  'replacement',
  'major_repair',
  'standard_repair',
  'minor',
  'diagnostic',
]);

export const revenueTierLabelSchema = z.enum(['$$$$', '$$$', '$$', '$', '$$?']);

export const revenueConfidenceSchema = z.enum(['low', 'medium', 'high']);

export const callerTypeSchema = z.enum([
  'residential',
  'commercial',
  'vendor',
  'recruiting',
  'unknown',
]);

export const primaryIntentSchema = z.enum([
  'new_lead',
  'active_job_issue',
  'booking_request',
  'admin_billing',
  'solicitation',
]);

export const bookingStatusSchema = z.enum(['confirmed', 'attempted_failed', 'not_requested']);

export const statusColorSchema = z.enum(['red', 'green', 'blue', 'gray']);

// V5 Velocity Enhancement schemas
export const workTypeSchema = z.enum(['service', 'maintenance', 'install', 'admin']);
export const sentimentScoreSchema = z.number().int().min(1).max(5);

// HVAC Must-Have schemas (Owner-Operator Decision Support)
export const propertyTypeSchema = z.enum(['house', 'condo', 'apartment', 'commercial']);
export const systemStatusSchema = z.enum(['completely_down', 'partially_working', 'running_but_ineffective']);
export const equipmentAgeBracketSchema = z.enum(['under_10', '10_to_15', 'over_15', 'unknown']);

// ============================================
// Jobs Webhook Schema (/api/webhook/jobs)
// ============================================

export const jobsWebhookSchema = z.object({
  // Required fields
  customer_name: z.string().min(1),
  customer_phone: z.string().min(1),
  customer_address: z.string().min(1),
  service_type: serviceTypeSchema,
  urgency: urgencySchema,
  user_email: z.string().email(),

  // Optional fields
  ai_summary: z.string().optional(),
  scheduled_at: z.string().datetime({ offset: true }).optional(),
  call_transcript: z.string().optional(),

  // Revenue estimation fields
  estimated_value: z.number().optional(),
  estimated_revenue_low: z.number().optional(),
  estimated_revenue_high: z.number().optional(),
  estimated_revenue_display: z.string().optional(),
  revenue_confidence: revenueConfidenceSchema.optional(),
  revenue_factors: z.array(z.string()).optional(),
  potential_replacement: z.boolean().optional(),

  // Call outcome for Lead creation
  end_call_reason: endCallReasonSchema.optional(),
  issue_description: z.string().optional(),

  // Sales lead specific fields
  equipment_type: z.string().optional(),
  equipment_age: z.string().optional(),
  sales_lead_notes: z.string().optional(),

  // Revenue tier classification
  revenue_tier: revenueTierSchema.optional(),
  revenue_tier_label: revenueTierLabelSchema.optional(),
  revenue_tier_signals: z.array(z.string()).optional(),

  // Extended revenue tier fields
  revenue_tier_description: z.string().optional(),
  revenue_tier_range: z.string().optional(),

  // Diagnostic context fields
  problem_duration: z.string().optional(),
  problem_onset: z.string().optional(),
  problem_pattern: z.string().optional(),
  customer_attempted_fixes: z.string().optional(),

  // Call tracking
  call_id: z.string().optional(),

  // V3 Triage Engine fields
  caller_type: callerTypeSchema.optional(),
  primary_intent: primaryIntentSchema.optional(),
  booking_status: bookingStatusSchema.optional(),
  is_callback_complaint: z.boolean().optional(),

  // V3 Status Color and Archive fields
  status_color: statusColorSchema.optional(),
  is_archived: z.boolean().optional(),

  // V4 Priority Color (explicit from backend, overrides derived color)
  priority_color: statusColorSchema.optional(),
  priority_reason: z.string().optional(),

  // V5 Velocity Enhancements
  sentiment_score: sentimentScoreSchema.optional(),
  work_type: workTypeSchema.optional(),

  // HVAC Must-Have Fields (Owner-Operator Decision Support)
  property_type: propertyTypeSchema.optional(),
  system_status: systemStatusSchema.optional(),
  equipment_age_bracket: equipmentAgeBracketSchema.optional(),
  is_decision_maker: z.boolean().optional(),
  decision_maker_contact: z.string().optional(),

  // V6 HVAC Smart Tag Taxonomy (117 tags from V2 backend)
  tags: z.record(z.string(), z.array(z.string())).optional(),
});

export type JobsWebhookPayload = z.infer<typeof jobsWebhookSchema>;

// ============================================
// Calls Webhook Schema (/api/webhook/calls)
// ============================================

export const transcriptMessageSchema = z.object({
  role: z.enum(['agent', 'user']),
  content: z.string(),
});

export const callsWebhookSchema = z.object({
  // Required fields
  call_id: z.string().min(1),
  phone_number: z.string().min(1),
  user_email: z.string().email(),
  started_at: z.string().datetime({ offset: true }),

  // Optional fields
  retell_call_id: z.string().optional(),
  customer_name: z.string().optional(),
  ended_at: z.string().datetime({ offset: true }).optional(),
  duration_seconds: z.number().int().nonnegative().optional(),
  direction: z.enum(['inbound', 'outbound']).optional(),
  outcome: z.string().optional(),
  hvac_issue_type: z.string().optional(),
  urgency_tier: z.string().optional(),
  problem_description: z.string().optional(),
  revenue_tier_label: z.string().optional(),
  revenue_tier_signals: z.array(z.string()).optional(),
  transcript_object: z.array(transcriptMessageSchema).optional(),
  job_id: z.string().optional(),
  lead_id: z.string().optional(),
});

export type CallsWebhookPayload = z.infer<typeof callsWebhookSchema>;

// ============================================
// Emergency Alerts Webhook Schema (/api/webhook/emergency-alerts)
// ============================================

export const emergencyAlertsWebhookSchema = z.object({
  // Required fields
  phone_number: z.string().min(1),
  problem_description: z.string().min(1),
  user_email: z.string().email(),
  sms_sent_at: z.string().datetime({ offset: true }),
  callback_promised_minutes: z.number().int().positive(),

  // Optional fields
  alert_id: z.string().optional(),
  call_id: z.string().optional(),
  customer_name: z.string().optional(),
  customer_address: z.string().optional(),
  urgency_tier: z.string().optional(),
  sms_message_sid: z.string().optional(),
});

export type EmergencyAlertsWebhookPayload = z.infer<typeof emergencyAlertsWebhookSchema>;

// Emergency alerts PATCH schema (for status updates)
export const emergencyAlertsPatchSchema = z
  .object({
    alert_id: z.string().optional(),
    backend_alert_id: z.string().optional(),
    callback_status: z.string().optional(),
    callback_delivered_at: z.string().datetime({ offset: true }).optional(),
    resolved_at: z.string().datetime({ offset: true }).optional(),
    resolution_notes: z.string().optional(),
    converted_to_job_id: z.string().optional(),
    converted_to_lead_id: z.string().optional(),
  })
  .refine((data) => data.alert_id || data.backend_alert_id, {
    message: 'Either alert_id or backend_alert_id must be provided',
  });

export type EmergencyAlertsPatchPayload = z.infer<typeof emergencyAlertsPatchSchema>;

// ============================================
// Operator Notes Webhook Schema (/api/webhook/operator-notes)
// ============================================

export const operatorNotesWebhookSchema = z.object({
  // Required fields
  customer_phone: z.string().min(1),
  note_text: z.string().min(1),
  user_email: z.string().email(),

  // Optional fields
  customer_name: z.string().optional(),
  created_by: z.string().optional(),
  expires_at: z.string().datetime({ offset: true }).optional(),
  is_active: z.boolean().optional(),
  backend_note_id: z.string().optional(),
  job_id: z.string().optional(),
  lead_id: z.string().optional(),
});

export type OperatorNotesWebhookPayload = z.infer<typeof operatorNotesWebhookSchema>;

// ============================================
// Validation Helper
// ============================================

export interface ValidationResult<T> {
  success: true;
  data: T;
}

export interface ValidationError {
  success: false;
  error: string;
  details: z.ZodIssue[];
}

export function validateWebhookPayload<T>(
  schema: z.ZodType<T>,
  data: unknown
): ValidationResult<T> | ValidationError {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    error: 'Validation failed',
    details: result.error.issues,
  };
}

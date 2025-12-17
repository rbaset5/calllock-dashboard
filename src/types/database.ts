// Database types for CallSeal Dashboard
// These match the schema in supabase/migrations/0001_initial_schema.sql
// and 0002_mobile_first_schema.sql

export type JobStatus = 'new' | 'confirmed' | 'en_route' | 'on_site' | 'complete' | 'cancelled';
export type UrgencyLevel = 'low' | 'medium' | 'high' | 'emergency';
export type ServiceType = 'hvac' | 'plumbing' | 'electrical' | 'general';

// Revenue tier classification from AI
export type RevenueTier = 'replacement' | 'major_repair' | 'standard_repair' | 'minor' | 'diagnostic';
export type RevenueTierLabel = '$$$$' | '$$$' | '$$' | '$' | '$$?';
export type RevenueConfidence = 'low' | 'medium' | 'high';

// New types for mobile-first IA
export type LeadStatus = 'callback_requested' | 'thinking' | 'voicemail_left' | 'info_only' | 'deferred' | 'converted' | 'lost' | 'abandoned' | 'sales_opportunity';
export type LeadPriority = 'hot' | 'warm' | 'cold';
export type BookingReviewStatus = 'pending' | 'confirmed' | 'adjusted' | 'cancelled';

// V4 Priority Color System
// RED: Callback risk (customer frustrated, repeat issue, demanded manager)
// GREEN: Commercial/high-value (commercial property, >$1000 job, replacement)
// BLUE: Standard residential (default for valid leads)
// GRAY: Spam/vendor (sales calls, solicitations)
export type PriorityColor = 'red' | 'green' | 'blue' | 'gray';

// V4 Callback Outcome (what happened after contractor called back)
export type CallbackOutcome = 'booked' | 'resolved' | 'try_again' | 'no_answer';

// Action Item types for the Today screen
// - missed_call: Customer hung up (Lead status: abandoned) - TRUE missed call
// - needs_callback: Customer requested callback (Lead status: callback_requested)
// - callback_requested: Customer thinking it over (Lead status: thinking)
// - pending_quote: Voicemail left (Lead status: voicemail_left)
// - follow_up_due: Completed jobs needing follow-up (from Jobs table)
export type ActionItemType = 'missed_call' | 'needs_callback' | 'callback_requested' | 'pending_quote' | 'follow_up_due';
export type ActionItemUrgency = 'high' | 'medium' | 'low';

export interface User {
  id: string;
  email: string;
  phone: string | null;
  business_name: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  user_id: string;
  status: JobStatus;
  needs_action: boolean;
  needs_action_note: string | null;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  service_type: ServiceType;
  urgency: UrgencyLevel;
  ai_summary: string | null;
  call_transcript: string | null;
  scheduled_at: string | null;
  revenue: number | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  // New fields for mobile-first IA
  customer_id: string | null;
  cal_com_booking_uid: string | null;
  is_ai_booked: boolean;
  booking_confirmed: boolean;
  started_at: string | null;
  travel_started_at: string | null;
  estimated_value: number | null;
  // Revenue tier classification from AI
  revenue_tier: RevenueTier | null;
  revenue_tier_label: RevenueTierLabel | null;
  revenue_tier_signals: string[] | null;
  // Extended revenue tier fields
  revenue_confidence: RevenueConfidence | null;
  revenue_tier_description: string | null;
  revenue_tier_range: string | null;
  // Diagnostic context fields
  problem_duration: string | null;
  problem_onset: string | null;
  problem_pattern: string | null;
  customer_attempted_fixes: string | null;
  // V4 Priority (retained from lead conversion)
  priority_color: PriorityColor | null;
  priority_reason: string | null;
}

// Equipment on file for a customer
export interface CustomerEquipment {
  type: string;         // e.g., "AC", "Furnace", "Heat Pump"
  brand?: string;       // e.g., "Carrier", "Trane"
  model?: string;       // Model number
  year?: number;        // Install year
  location?: string;    // e.g., "Attic", "Basement", "Garage"
}

export interface Customer {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  equipment: CustomerEquipment[];
  notes: string | null;
  lifetime_value: number;
  total_jobs: number;
  last_service_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  user_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  status: LeadStatus;
  priority: LeadPriority;
  why_not_booked: string | null;
  issue_description: string | null;
  service_type: ServiceType;
  urgency: UrgencyLevel;
  estimated_value: number | null;
  distance_miles: number | null;
  callback_requested_at: string | null;
  remind_at: string | null;
  call_transcript: string | null;
  ai_summary: string | null;
  original_call_id: string | null;
  converted_job_id: string | null;
  converted_at: string | null;
  lost_reason: string | null;
  lost_at: string | null;
  created_at: string;
  updated_at: string;
  // Revenue tier classification from AI
  revenue_tier: RevenueTier | null;
  revenue_tier_label: RevenueTierLabel | null;
  revenue_tier_signals: string[] | null;
  // Extended revenue tier fields
  revenue_confidence: RevenueConfidence | null;
  revenue_tier_description: string | null;
  revenue_tier_range: string | null;
  // Diagnostic context fields
  problem_duration: string | null;
  problem_onset: string | null;
  problem_pattern: string | null;
  customer_attempted_fixes: string | null;
  // Sales lead info (from replacement/sales inquiry calls)
  sales_lead_notes: string | null;
  equipment_type: string | null;
  equipment_age: string | null;
  // Original call outcome (preserves granularity from backend)
  end_call_reason: EndCallReason | null;
  // V4 Priority Color System
  priority_color: PriorityColor;
  priority_reason: string | null;
  // V4 Outcome Tracking
  callback_outcome: CallbackOutcome | null;
  callback_outcome_at: string | null;
  callback_outcome_note: string | null;
  // V4 Call Tap Tracking (for outcome prompt)
  last_call_tapped_at: string | null;
  // V4 Time Preference (customer's stated preference)
  time_preference: string | null;
}

export interface AIBookingReview {
  id: string;
  user_id: string;
  job_id: string;
  status: BookingReviewStatus;
  original_scheduled_at: string;
  cal_com_booking_uid: string | null;
  adjusted_scheduled_at: string | null;
  adjustment_reason: string | null;
  cancellation_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
}

// SMS event types for categorizing messages
export type SmsEventType =
  | 'booking_notification'
  | 'booking_confirmation'
  | 'reminder'
  | 'emergency_alert'
  | 'sales_lead_alert'
  | 'abandoned_call'
  | 'schedule_conflict'
  | 'operator_reply'
  | 'customer_reply'
  | 'system';

// Alert types and status for SMS alert context
export type AlertType = 'emergency' | 'sales_lead' | 'abandoned_call';
export type AlertStatus = 'pending' | 'replied' | 'resolved' | 'expired';
export type AlertReplyCode = '1' | '2' | '3' | '4' | '5';

export interface SmsAlertContext {
  id: string;
  user_id: string | null;
  operator_phone: string;
  alert_type: AlertType;
  customer_phone: string | null;
  customer_name: string | null;
  lead_id: string | null;
  job_id: string | null;
  status: AlertStatus;
  replied_at: string | null;
  reply_code: AlertReplyCode | null;
  created_at: string;
}

export interface SmsLog {
  id: string;
  job_id: string | null;
  lead_id: string | null;
  user_id: string;
  direction: 'outbound' | 'inbound';
  to_phone: string;
  from_phone: string;
  body: string;
  twilio_sid: string | null;
  status: string | null;
  created_at: string;
  // Delivery status tracking (from Twilio webhooks)
  event_type: SmsEventType | null;
  delivery_status: string | null;
  delivery_status_updated_at: string | null;
}

// Call outcome types (matches backend EndCallReason)
export type CallOutcome =
  | 'completed'
  | 'wrong_number'
  | 'callback_later'
  | 'safety_emergency'
  | 'urgent_escalation'
  | 'out_of_area'
  | 'waitlist_added'
  | 'customer_hangup'
  | 'sales_lead'
  | 'cancelled'
  | 'rescheduled';

// Alias for clarity - EndCallReason is the backend term
export type EndCallReason = CallOutcome;

// Callback status for emergency alerts
export type CallbackStatus = 'pending' | 'delivered' | 'expired' | 'no_answer';

// Structured transcript message from Retell
export interface TranscriptMessage {
  role: 'agent' | 'user';
  content: string;
}

// Call record (synced from backend)
export interface Call {
  id: string;
  user_id: string;
  call_id: string;
  retell_call_id: string | null;
  phone_number: string;
  customer_name: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  direction: 'inbound' | 'outbound';
  outcome: CallOutcome | null;
  hvac_issue_type: string | null;
  urgency_tier: UrgencyLevel | null;
  problem_description: string | null;
  revenue_tier_label: string | null;
  revenue_tier_signals: string[] | null;
  transcript_object: TranscriptMessage[] | null;  // Structured transcript with speaker labels
  job_id: string | null;
  lead_id: string | null;
  synced_from_backend: boolean;
  backend_call_id: string | null;
  created_at: string;
  updated_at: string;
}

// Emergency alert record (Tier 2 urgent alerts synced from backend)
export interface EmergencyAlert {
  id: string;
  user_id: string;
  alert_id: string | null;
  call_id: string | null;
  phone_number: string;
  customer_name: string | null;
  customer_address: string | null;
  urgency_tier: string;
  problem_description: string;
  sms_sent_at: string;
  sms_message_sid: string | null;
  callback_promised_by: string;
  callback_delivered_at: string | null;
  callback_status: CallbackStatus;
  resolved_at: string | null;
  resolution_notes: string | null;
  converted_to_job_id: string | null;
  converted_to_lead_id: string | null;
  synced_from_backend: boolean;
  backend_alert_id: string | null;
  created_at: string;
  updated_at: string;
}

// Operator notes about customers (synced from backend or created in dashboard)
export interface OperatorNote {
  id: string;
  user_id: string;
  customer_phone: string;
  customer_name: string | null;
  note_text: string;
  created_by: string | null;
  expires_at: string | null;
  is_active: boolean;
  job_id: string | null;
  lead_id: string | null;
  customer_id: string | null;
  synced_from_backend: boolean;
  backend_note_id: string | null;
  created_at: string;
  updated_at: string;
}

// Database schema type for Supabase client
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<User, 'id'>>;
      };
      jobs: {
        Row: Job;
        Insert: Omit<Job, 'id' | 'created_at' | 'updated_at' | 'is_ai_booked' | 'booking_confirmed'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          is_ai_booked?: boolean;
          booking_confirmed?: boolean;
        };
        Update: Partial<Omit<Job, 'id' | 'user_id'>>;
      };
      sms_log: {
        Row: SmsLog;
        Insert: Omit<SmsLog, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<SmsLog, 'id'>>;
      };
      customers: {
        Row: Customer;
        Insert: Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'lifetime_value' | 'total_jobs'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          lifetime_value?: number;
          total_jobs?: number;
        };
        Update: Partial<Omit<Customer, 'id' | 'user_id'>>;
      };
      leads: {
        Row: Lead;
        Insert: Omit<Lead, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Lead, 'id' | 'user_id'>>;
      };
      ai_booking_reviews: {
        Row: AIBookingReview;
        Insert: Omit<AIBookingReview, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<AIBookingReview, 'id' | 'user_id' | 'job_id'>>;
      };
      operator_notes: {
        Row: OperatorNote;
        Insert: Omit<OperatorNote, 'id' | 'created_at' | 'updated_at' | 'synced_from_backend'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          synced_from_backend?: boolean;
        };
        Update: Partial<Omit<OperatorNote, 'id' | 'user_id'>>;
      };
      calls: {
        Row: Call;
        Insert: Omit<Call, 'id' | 'created_at' | 'updated_at' | 'synced_from_backend'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          synced_from_backend?: boolean;
        };
        Update: Partial<Omit<Call, 'id' | 'user_id'>>;
      };
      emergency_alerts: {
        Row: EmergencyAlert;
        Insert: Omit<EmergencyAlert, 'id' | 'created_at' | 'updated_at' | 'synced_from_backend' | 'callback_status'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          synced_from_backend?: boolean;
          callback_status?: CallbackStatus;
        };
        Update: Partial<Omit<EmergencyAlert, 'id' | 'user_id'>>;
      };
    };
    Views: {
      monthly_revenue: {
        Row: {
          user_id: string;
          month: string;
          jobs_completed: number;
          total_revenue: number;
        };
      };
      jobs_needing_attention: {
        Row: Job & { days_since_created: number };
      };
      stale_jobs: {
        Row: Job & { hours_since_created: number };
      };
      active_leads: {
        Row: Lead & { sort_priority: number; hours_since_created: number };
      };
      today_schedule: {
        Row: Job & {
          customer_display_name: string | null;
          customer_equipment: CustomerEquipment[] | null;
          customer_notes: string | null;
          customer_lifetime_value: number | null;
          customer_total_jobs: number | null;
        };
      };
      pending_booking_reviews: {
        Row: AIBookingReview & {
          customer_name: string;
          customer_phone: string;
          customer_address: string;
          service_type: ServiceType;
          urgency: UrgencyLevel;
          ai_summary: string | null;
        };
      };
    };
    Enums: {
      job_status: JobStatus;
      urgency_level: UrgencyLevel;
      service_type: ServiceType;
      lead_status: LeadStatus;
      lead_priority: LeadPriority;
      booking_review_status: BookingReviewStatus;
    };
  };
}

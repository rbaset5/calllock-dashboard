// Database types for CallLock Dashboard
// These match the schema in supabase/migrations/0001_initial_schema.sql

export type JobStatus = 'new' | 'confirmed' | 'en_route' | 'on_site' | 'complete' | 'cancelled';
export type UrgencyLevel = 'low' | 'medium' | 'high' | 'emergency';
export type ServiceType = 'hvac' | 'plumbing' | 'electrical' | 'general';

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
}

export interface SmsLog {
  id: string;
  job_id: string | null;
  user_id: string;
  direction: 'outbound' | 'inbound';
  to_phone: string;
  from_phone: string;
  body: string;
  twilio_sid: string | null;
  status: string | null;
  created_at: string;
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
        Insert: Omit<Job, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
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
    };
    Enums: {
      job_status: JobStatus;
      urgency_level: UrgencyLevel;
      service_type: ServiceType;
    };
  };
}

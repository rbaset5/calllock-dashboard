-- CallLock Dashboard Database Schema
-- Migration: 0001_initial_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE job_status AS ENUM (
  'new',
  'confirmed',
  'en_route',
  'on_site',
  'complete',
  'cancelled'
);

CREATE TYPE urgency_level AS ENUM (
  'low',
  'medium',
  'high',
  'emergency'
);

CREATE TYPE service_type AS ENUM (
  'hvac',
  'plumbing',
  'electrical',
  'general'
);

-- ============================================
-- USERS TABLE
-- Extends Supabase auth.users with business info
-- ============================================

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  phone TEXT,  -- E.164 format for SMS alerts
  business_name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for email lookups
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_phone ON public.users(phone);

-- ============================================
-- JOBS TABLE
-- Core table for tracking all jobs/leads
-- ============================================

CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Status and flags
  status job_status NOT NULL DEFAULT 'new',
  needs_action BOOLEAN NOT NULL DEFAULT false,
  needs_action_note TEXT,

  -- Customer information
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,  -- E.164 format
  customer_address TEXT NOT NULL,

  -- Job details
  service_type service_type NOT NULL,
  urgency urgency_level NOT NULL DEFAULT 'medium',
  ai_summary TEXT,  -- From CallLock AI conversation
  call_transcript TEXT,  -- Optional full transcript

  -- Scheduling
  scheduled_at TIMESTAMPTZ,

  -- Completion tracking
  revenue DECIMAL(10, 2),  -- Filled when job complete
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_jobs_user_id ON public.jobs(user_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_scheduled_at ON public.jobs(scheduled_at);
CREATE INDEX idx_jobs_needs_action ON public.jobs(needs_action) WHERE needs_action = true;
CREATE INDEX idx_jobs_created_at ON public.jobs(created_at DESC);

-- Composite index for dashboard queries
CREATE INDEX idx_jobs_user_status_scheduled ON public.jobs(user_id, status, scheduled_at);

-- Index for stale job detection (jobs in 'new' status for too long)
CREATE INDEX idx_jobs_stale ON public.jobs(user_id, status, created_at) WHERE status = 'new';

-- ============================================
-- SMS LOG TABLE
-- Track all sent/received SMS messages
-- ============================================

CREATE TABLE public.sms_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  to_phone TEXT NOT NULL,
  from_phone TEXT NOT NULL,
  body TEXT NOT NULL,

  twilio_sid TEXT,  -- Twilio message SID
  status TEXT,  -- delivered, failed, etc.

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sms_log_job_id ON public.sms_log(job_id);
CREATE INDEX idx_sms_log_user_id ON public.sms_log(user_id);
CREATE INDEX idx_sms_log_created_at ON public.sms_log(created_at DESC);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to users table
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Apply trigger to jobs table
CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- AUTO-CREATE USER PROFILE ON AUTH SIGNUP
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, business_name, phone, timezone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Business'),
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'timezone', 'America/New_York')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_log ENABLE ROW LEVEL SECURITY;

-- Users: can only read/update their own record
CREATE POLICY users_select_own ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY users_update_own ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Jobs: users can only access their own jobs
CREATE POLICY jobs_select_own ON public.jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY jobs_insert_own ON public.jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY jobs_update_own ON public.jobs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY jobs_delete_own ON public.jobs
  FOR DELETE USING (auth.uid() = user_id);

-- SMS Log: users can only see their own logs
CREATE POLICY sms_log_select_own ON public.sms_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY sms_log_insert_own ON public.sms_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- SERVICE ROLE POLICIES (for webhooks/admin)
-- These bypass RLS for server-side operations
-- ============================================

-- Allow service role to insert jobs (for webhook)
CREATE POLICY jobs_service_insert ON public.jobs
  FOR INSERT TO service_role
  WITH CHECK (true);

-- Allow service role to read all jobs (for scheduled tasks)
CREATE POLICY jobs_service_select ON public.jobs
  FOR SELECT TO service_role
  USING (true);

-- Allow service role to update jobs (for SMS commands)
CREATE POLICY jobs_service_update ON public.jobs
  FOR UPDATE TO service_role
  USING (true);

-- Allow service role to read users (for webhook user lookup)
CREATE POLICY users_service_select ON public.users
  FOR SELECT TO service_role
  USING (true);

-- Allow service role to insert SMS logs
CREATE POLICY sms_log_service_insert ON public.sms_log
  FOR INSERT TO service_role
  WITH CHECK (true);

-- ============================================
-- REALTIME CONFIGURATION
-- Enable realtime updates for jobs table
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;

-- ============================================
-- VIEWS (for convenient queries)
-- ============================================

-- Monthly revenue summary view
CREATE OR REPLACE VIEW public.monthly_revenue AS
SELECT
  user_id,
  DATE_TRUNC('month', completed_at) AS month,
  COUNT(*) AS jobs_completed,
  COALESCE(SUM(revenue), 0) AS total_revenue
FROM public.jobs
WHERE status = 'complete' AND completed_at IS NOT NULL
GROUP BY user_id, DATE_TRUNC('month', completed_at);

-- Jobs needing attention view
CREATE OR REPLACE VIEW public.jobs_needing_attention AS
SELECT
  j.*,
  EXTRACT(EPOCH FROM (NOW() - j.created_at)) / 86400 AS days_since_created
FROM public.jobs j
WHERE j.needs_action = true
  AND j.status NOT IN ('complete', 'cancelled');

-- Stale jobs view (new status > 24 hours)
CREATE OR REPLACE VIEW public.stale_jobs AS
SELECT
  j.*,
  EXTRACT(EPOCH FROM (NOW() - j.created_at)) / 3600 AS hours_since_created
FROM public.jobs j
WHERE j.status = 'new'
  AND j.created_at < NOW() - INTERVAL '24 hours';

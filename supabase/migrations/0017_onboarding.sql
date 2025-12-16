-- V4 Onboarding Schema
-- Supports 5-step onboarding wizard:
-- 1. Phone Numbers (business + cell)
-- 2. Calendar Connection (Cal.com OAuth)
-- 3. Business Hours (weekly schedule)
-- 4. Call Forwarding Setup (carrier-specific)
-- 5. Test Call (verification)

-- ============================================
-- USER ONBOARDING STATUS
-- ============================================

-- Add onboarding fields to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 1;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS business_phone TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS carrier TEXT; -- att, verizon, tmobile, voip, other
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS call_forwarding_verified BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS cal_com_connected BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS cal_com_user_id TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS cal_com_event_type_id INTEGER;

-- ============================================
-- BUSINESS HOURS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  is_open BOOLEAN DEFAULT true,
  open_time TIME DEFAULT '08:00',
  close_time TIME DEFAULT '18:00',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, day_of_week)
);

-- Enable RLS
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;

-- RLS policies for business_hours
CREATE POLICY "Users can view own business hours"
  ON public.business_hours FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own business hours"
  ON public.business_hours FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own business hours"
  ON public.business_hours FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own business hours"
  ON public.business_hours FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can manage business hours (for admin/onboarding API)
CREATE POLICY "Service role can manage business hours"
  ON public.business_hours FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- SERVICE AREAS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.service_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  zip_code TEXT NOT NULL,
  city TEXT,
  state TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, zip_code)
);

-- Enable RLS
ALTER TABLE public.service_areas ENABLE ROW LEVEL SECURITY;

-- RLS policies for service_areas
CREATE POLICY "Users can view own service areas"
  ON public.service_areas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own service areas"
  ON public.service_areas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own service areas"
  ON public.service_areas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own service areas"
  ON public.service_areas FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- ONBOARDING TEST CALLS TABLE
-- Track test calls during onboarding verification
-- ============================================

CREATE TABLE IF NOT EXISTS public.onboarding_test_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  business_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'ringing', 'answered', 'completed', 'failed')),
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  twilio_call_sid TEXT,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.onboarding_test_calls ENABLE ROW LEVEL SECURITY;

-- RLS policies for onboarding_test_calls
CREATE POLICY "Users can view own test calls"
  ON public.onboarding_test_calls FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own test calls"
  ON public.onboarding_test_calls FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can manage test calls (for webhooks/admin)
CREATE POLICY "Service role can manage test calls"
  ON public.onboarding_test_calls FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_onboarding_test_calls_user
  ON public.onboarding_test_calls(user_id, initiated_at DESC);

-- ============================================
-- SMS RETRY QUEUE TABLE
-- For retrying failed SMS messages with exponential backoff
-- ============================================

CREATE TABLE IF NOT EXISTS public.sms_retry_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_message_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  to_phone TEXT NOT NULL,
  message_body TEXT NOT NULL,
  event_type TEXT,
  retry_attempt INTEGER DEFAULT 1,
  max_attempts INTEGER DEFAULT 3,
  retry_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, sent, failed
  completed_at TIMESTAMPTZ,
  twilio_sid TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.sms_retry_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies for sms_retry_queue
CREATE POLICY "Users can view own retry queue"
  ON public.sms_retry_queue FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage retry queue (for cron jobs)
CREATE POLICY "Service role can manage retry queue"
  ON public.sms_retry_queue FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Index for processing retries
CREATE INDEX IF NOT EXISTS idx_sms_retry_queue_pending
  ON public.sms_retry_queue(retry_at)
  WHERE status = 'pending';

-- ============================================
-- EXTEND SMS_LOG EVENT_TYPE CONSTRAINT
-- Add 'system' for onboarding/welcome messages
-- ============================================

-- Drop and recreate the constraint to include 'system'
ALTER TABLE public.sms_log DROP CONSTRAINT IF EXISTS sms_log_event_type_check;
ALTER TABLE public.sms_log ADD CONSTRAINT sms_log_event_type_check
  CHECK (event_type IS NULL OR event_type IN (
    'same_day_booking',
    'future_booking',
    'callback_request',
    'schedule_conflict',
    'cancellation',
    'reply_confirmation',
    'reply_customer_phone',
    'stale_job_alert',
    'complete_confirmation',
    'system',
    'other'
  ));

-- ============================================
-- ONBOARDING CHECKLIST VIEW
-- Helpful for debugging onboarding status
-- ============================================

CREATE OR REPLACE VIEW public.onboarding_status AS
SELECT
  u.id as user_id,
  u.business_name,
  u.phone IS NOT NULL as has_cell_phone,
  u.business_phone IS NOT NULL as has_business_phone,
  u.cal_com_connected,
  EXISTS(SELECT 1 FROM public.business_hours bh WHERE bh.user_id = u.id) as has_business_hours,
  u.call_forwarding_verified,
  u.onboarding_step,
  u.onboarding_completed_at IS NOT NULL as onboarding_complete,
  CASE
    WHEN u.onboarding_completed_at IS NOT NULL THEN 5
    WHEN u.call_forwarding_verified THEN 4
    WHEN EXISTS(SELECT 1 FROM public.business_hours bh WHERE bh.user_id = u.id) THEN 3
    WHEN u.cal_com_connected THEN 2
    WHEN u.phone IS NOT NULL AND u.business_phone IS NOT NULL THEN 1
    ELSE 0
  END as completed_steps
FROM public.users u;

-- ============================================
-- DEFAULT BUSINESS HOURS FUNCTION
-- ============================================

-- Function to create default business hours for a new user
CREATE OR REPLACE FUNCTION public.create_default_business_hours(p_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Monday through Friday, 8 AM to 6 PM
  INSERT INTO public.business_hours (user_id, day_of_week, is_open, open_time, close_time)
  VALUES
    (p_user_id, 0, false, '08:00', '18:00'),  -- Sunday - closed
    (p_user_id, 1, true, '08:00', '18:00'),   -- Monday
    (p_user_id, 2, true, '08:00', '18:00'),   -- Tuesday
    (p_user_id, 3, true, '08:00', '18:00'),   -- Wednesday
    (p_user_id, 4, true, '08:00', '18:00'),   -- Thursday
    (p_user_id, 5, true, '08:00', '18:00'),   -- Friday
    (p_user_id, 6, false, '08:00', '18:00')   -- Saturday - closed
  ON CONFLICT (user_id, day_of_week) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_business_hours_user ON public.business_hours(user_id);
CREATE INDEX IF NOT EXISTS idx_service_areas_user ON public.service_areas(user_id);
CREATE INDEX IF NOT EXISTS idx_service_areas_zip ON public.service_areas(zip_code);

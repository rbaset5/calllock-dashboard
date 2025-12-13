-- Migration: Add calls and emergency_alerts tables for backend data sync
-- These tables receive data pushed from the backend via webhooks

-- ============================================
-- Calls Table - tracks all inbound/outbound calls
-- ============================================
CREATE TABLE IF NOT EXISTS public.calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Call identification
  call_id TEXT NOT NULL,
  retell_call_id TEXT,

  -- Customer info
  phone_number TEXT NOT NULL,
  customer_name TEXT,

  -- Call timing
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,

  -- Call details
  direction TEXT DEFAULT 'inbound', -- inbound/outbound
  outcome TEXT, -- completed, wrong_number, callback_later, safety_emergency, urgent_escalation, out_of_area, customer_hangup, sales_lead, cancelled, rescheduled

  -- HVAC context
  hvac_issue_type TEXT,
  urgency_tier TEXT, -- Emergency, Urgent, Routine, Estimate
  problem_description TEXT,

  -- Revenue classification
  revenue_tier_label TEXT,
  revenue_tier_signals TEXT[],

  -- Links to other records
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,

  -- Sync metadata
  synced_from_backend BOOLEAN DEFAULT true,
  backend_call_id TEXT, -- Original call_id from backend for dedup

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate syncs
  UNIQUE(user_id, backend_call_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_calls_user_id ON public.calls(user_id);
CREATE INDEX IF NOT EXISTS idx_calls_phone_number ON public.calls(phone_number);
CREATE INDEX IF NOT EXISTS idx_calls_started_at ON public.calls(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_outcome ON public.calls(outcome);
CREATE INDEX IF NOT EXISTS idx_calls_job_id ON public.calls(job_id);
CREATE INDEX IF NOT EXISTS idx_calls_lead_id ON public.calls(lead_id);

-- Enable RLS
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

-- RLS policies for calls
CREATE POLICY "Users can view their own calls"
  ON public.calls FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calls"
  ON public.calls FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calls"
  ON public.calls FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can do anything (for webhooks)
CREATE POLICY "Service role has full access to calls"
  ON public.calls FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- Emergency Alerts Table - tracks Tier 2 urgent alerts
-- ============================================
CREATE TABLE IF NOT EXISTS public.emergency_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Alert identification
  alert_id TEXT,
  call_id TEXT,

  -- Customer info
  phone_number TEXT NOT NULL,
  customer_name TEXT,
  customer_address TEXT,

  -- Alert details
  urgency_tier TEXT NOT NULL DEFAULT 'Urgent',
  problem_description TEXT NOT NULL,

  -- SMS tracking
  sms_sent_at TIMESTAMPTZ NOT NULL,
  sms_message_sid TEXT, -- Twilio message SID

  -- Callback promise
  callback_promised_by TIMESTAMPTZ NOT NULL,
  callback_delivered_at TIMESTAMPTZ, -- When callback actually happened
  callback_status TEXT DEFAULT 'pending', -- pending, delivered, expired, no_answer

  -- Resolution tracking
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  converted_to_job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  converted_to_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,

  -- Sync metadata
  synced_from_backend BOOLEAN DEFAULT true,
  backend_alert_id TEXT, -- Original alert_id from backend for dedup

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate syncs
  UNIQUE(user_id, backend_alert_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_user_id ON public.emergency_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_phone_number ON public.emergency_alerts(phone_number);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_sms_sent_at ON public.emergency_alerts(sms_sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_callback_status ON public.emergency_alerts(callback_status);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_callback_promised_by ON public.emergency_alerts(callback_promised_by);

-- Enable RLS
ALTER TABLE public.emergency_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for emergency_alerts
CREATE POLICY "Users can view their own emergency alerts"
  ON public.emergency_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own emergency alerts"
  ON public.emergency_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own emergency alerts"
  ON public.emergency_alerts FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can do anything (for webhooks)
CREATE POLICY "Service role has full access to emergency alerts"
  ON public.emergency_alerts FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- Update trigger for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_calls_updated_at
  BEFORE UPDATE ON public.calls
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_emergency_alerts_updated_at
  BEFORE UPDATE ON public.emergency_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

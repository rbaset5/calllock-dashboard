-- SMS Alert Context Table
-- Tracks which lead/job/customer an SMS alert relates to for reply handling
-- When operators reply to alerts, we use this to find the correct record to update

CREATE TABLE public.sms_alert_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_phone TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  customer_phone TEXT,
  customer_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookups by operator phone (most recent first)
CREATE INDEX idx_sms_alert_context_lookup
  ON public.sms_alert_context(operator_phone, created_at DESC);

-- Index for cleanup queries
CREATE INDEX idx_sms_alert_context_created_at
  ON public.sms_alert_context(created_at);

-- Enable RLS
ALTER TABLE public.sms_alert_context ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for authenticated service role
-- This table is accessed by the webhook API using admin client
CREATE POLICY "Service role full access" ON public.sms_alert_context
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Comment for documentation
COMMENT ON TABLE public.sms_alert_context IS 'Tracks SMS alert context for reply handling. When an alert is sent, context is saved here so replies can be matched to the correct lead/job.';

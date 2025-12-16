-- V3 Triage Engine Fields
-- Migration: 0015_v3_triage_fields.sql
-- Adds caller classification fields for intelligent call triage

-- ============================================
-- ADD V3 TRIAGE FIELDS TO LEADS TABLE
-- ============================================

-- Caller type classification
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS caller_type TEXT;
COMMENT ON COLUMN public.leads.caller_type IS 'Caller classification: residential, commercial, vendor, recruiting, unknown';

-- Primary intent of the call
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS primary_intent TEXT;
COMMENT ON COLUMN public.leads.primary_intent IS 'Call purpose: new_lead, active_job_issue, booking_request, admin_billing, solicitation';

-- Booking outcome status
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS booking_status TEXT;
COMMENT ON COLUMN public.leads.booking_status IS 'Booking outcome: confirmed, attempted_failed, not_requested';

-- Callback complaint flag
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS is_callback_complaint BOOLEAN DEFAULT false;
COMMENT ON COLUMN public.leads.is_callback_complaint IS 'True if caller is complaining about previous service';

-- Dashboard status color for visual priority
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS status_color TEXT DEFAULT 'gray';
COMMENT ON COLUMN public.leads.status_color IS 'Visual priority indicator: red, yellow, green, gray';

-- ============================================
-- ADD V3 TRIAGE FIELDS TO CALLS TABLE
-- ============================================

-- Caller type classification
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS caller_type TEXT;
COMMENT ON COLUMN public.calls.caller_type IS 'Caller classification: residential, commercial, vendor, recruiting, unknown';

-- Primary intent of the call
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS primary_intent TEXT;
COMMENT ON COLUMN public.calls.primary_intent IS 'Call purpose: new_lead, active_job_issue, booking_request, admin_billing, solicitation';

-- Booking outcome status
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS booking_status TEXT;
COMMENT ON COLUMN public.calls.booking_status IS 'Booking outcome: confirmed, attempted_failed, not_requested';

-- Callback complaint flag
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS is_callback_complaint BOOLEAN DEFAULT false;
COMMENT ON COLUMN public.calls.is_callback_complaint IS 'True if caller is complaining about previous service';

-- Dashboard status color for visual priority
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS status_color TEXT DEFAULT 'gray';
COMMENT ON COLUMN public.calls.status_color IS 'Visual priority indicator: red, yellow, green, gray';

-- ============================================
-- CREATE INDEX FOR STATUS COLOR QUERIES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_leads_status_color ON public.leads(user_id, status_color)
  WHERE status NOT IN ('converted', 'lost');

CREATE INDEX IF NOT EXISTS idx_calls_status_color ON public.calls(user_id, status_color);

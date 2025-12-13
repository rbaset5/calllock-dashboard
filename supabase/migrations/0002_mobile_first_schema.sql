-- CallLock Dashboard Mobile-First Schema Extension
-- Migration: 0002_mobile_first_schema.sql
-- Adds leads, customers, and AI booking review tables for mobile-first IA

-- ============================================
-- NEW ENUMS
-- ============================================

CREATE TYPE lead_status AS ENUM (
  'callback_requested',  -- Hot: customer asked for callback
  'thinking',            -- Warm: customer wanted to think
  'voicemail_left',      -- Follow-up needed: AI left voicemail
  'info_only',           -- Just needed information
  'deferred',            -- Operator snoozed for later
  'converted',           -- Successfully converted to job
  'lost'                 -- Marked as lost
);

CREATE TYPE lead_priority AS ENUM (
  'hot',    -- Callback requested, urgent
  'warm',   -- Thinking it over
  'cold'    -- Info only, deferred
);

CREATE TYPE booking_review_status AS ENUM (
  'pending',    -- Awaiting operator review
  'confirmed',  -- Operator confirmed as-is
  'adjusted',   -- Operator changed time
  'cancelled'   -- Operator cancelled
);

-- ============================================
-- CUSTOMERS TABLE
-- CRM records with equipment and service history
-- ============================================

CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Customer information
  name TEXT NOT NULL,
  phone TEXT NOT NULL,  -- E.164 format, used for matching
  email TEXT,
  address TEXT,

  -- Equipment on file (array of equipment objects)
  -- Example: [{"type": "AC", "brand": "Carrier", "model": "24ACC636A003", "year": 2019, "location": "Attic"}]
  equipment JSONB DEFAULT '[]'::jsonb,

  -- Notes
  notes TEXT,

  -- Calculated fields (updated via triggers or app logic)
  lifetime_value DECIMAL(12, 2) DEFAULT 0,
  total_jobs INTEGER DEFAULT 0,
  last_service_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: one customer record per phone per user
  UNIQUE(user_id, phone)
);

-- Indexes for customers
CREATE INDEX idx_customers_user_id ON public.customers(user_id);
CREATE INDEX idx_customers_phone ON public.customers(user_id, phone);
CREATE INDEX idx_customers_name ON public.customers(user_id, name);
CREATE INDEX idx_customers_last_service ON public.customers(user_id, last_service_at DESC NULLS LAST);

-- Full-text search index for customer search
CREATE INDEX idx_customers_search ON public.customers
  USING gin(to_tsvector('english', name || ' ' || COALESCE(address, '') || ' ' || phone));

-- ============================================
-- LEADS TABLE
-- Follow-up leads that AI couldn't close
-- ============================================

CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Customer information
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT,

  -- Lead status and priority
  status lead_status NOT NULL DEFAULT 'callback_requested',
  priority lead_priority NOT NULL DEFAULT 'warm',

  -- Why AI couldn't book (shown as "Why here" in UI)
  why_not_booked TEXT,

  -- Issue details
  issue_description TEXT,
  service_type service_type DEFAULT 'hvac',
  urgency urgency_level DEFAULT 'medium',
  estimated_value DECIMAL(10, 2),

  -- Distance from operator (calculated, nullable)
  distance_miles DECIMAL(5, 1),

  -- Scheduling
  callback_requested_at TIMESTAMPTZ,  -- When customer wants callback
  remind_at TIMESTAMPTZ,              -- Snooze until this time

  -- Original call data
  call_transcript TEXT,
  ai_summary TEXT,
  original_call_id TEXT,  -- Reference to Retell call ID

  -- Conversion tracking
  converted_job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ,
  lost_reason TEXT,
  lost_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for leads
CREATE INDEX idx_leads_user_id ON public.leads(user_id);
CREATE INDEX idx_leads_status ON public.leads(user_id, status)
  WHERE status NOT IN ('converted', 'lost');
CREATE INDEX idx_leads_priority ON public.leads(user_id, priority, created_at DESC);
CREATE INDEX idx_leads_remind_at ON public.leads(remind_at)
  WHERE remind_at IS NOT NULL AND status NOT IN ('converted', 'lost');
CREATE INDEX idx_leads_created_at ON public.leads(created_at DESC);

-- ============================================
-- AI BOOKING REVIEWS TABLE
-- Pending AI-booked appointments needing confirmation
-- ============================================

CREATE TABLE public.ai_booking_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,

  -- Review status
  status booking_review_status NOT NULL DEFAULT 'pending',

  -- Original booking details
  original_scheduled_at TIMESTAMPTZ NOT NULL,
  cal_com_booking_uid TEXT,

  -- Adjustment details (if status = 'adjusted')
  adjusted_scheduled_at TIMESTAMPTZ,
  adjustment_reason TEXT,

  -- Cancellation reason (if status = 'cancelled')
  cancellation_reason TEXT,

  -- Review metadata
  reviewed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for AI booking reviews
CREATE INDEX idx_ai_booking_reviews_user_pending ON public.ai_booking_reviews(user_id)
  WHERE status = 'pending';
CREATE INDEX idx_ai_booking_reviews_job_id ON public.ai_booking_reviews(job_id);

-- ============================================
-- EXTEND JOBS TABLE
-- Add fields for customer linking, Cal.com, and timers
-- ============================================

-- Link jobs to customers
ALTER TABLE public.jobs ADD COLUMN customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

-- Cal.com integration
ALTER TABLE public.jobs ADD COLUMN cal_com_booking_uid TEXT;

-- AI booking tracking
ALTER TABLE public.jobs ADD COLUMN is_ai_booked BOOLEAN DEFAULT false;
ALTER TABLE public.jobs ADD COLUMN booking_confirmed BOOLEAN DEFAULT false;

-- Timer tracking for on-site duration
ALTER TABLE public.jobs ADD COLUMN started_at TIMESTAMPTZ;       -- When "Start Job" pressed
ALTER TABLE public.jobs ADD COLUMN travel_started_at TIMESTAMPTZ; -- When "En Route" pressed

-- Estimated value (before completion)
ALTER TABLE public.jobs ADD COLUMN estimated_value DECIMAL(10, 2);

-- Indexes for new job columns
CREATE INDEX idx_jobs_customer_id ON public.jobs(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_jobs_is_ai_booked ON public.jobs(user_id, is_ai_booked) WHERE is_ai_booked = true;
CREATE INDEX idx_jobs_today ON public.jobs(user_id, scheduled_at, status)
  WHERE status NOT IN ('complete', 'cancelled');

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on new tables
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_booking_reviews ENABLE ROW LEVEL SECURITY;

-- Customers: users can only access their own
CREATE POLICY customers_select_own ON public.customers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY customers_insert_own ON public.customers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY customers_update_own ON public.customers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY customers_delete_own ON public.customers
  FOR DELETE USING (auth.uid() = user_id);

-- Leads: users can only access their own
CREATE POLICY leads_select_own ON public.leads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY leads_insert_own ON public.leads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY leads_update_own ON public.leads
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY leads_delete_own ON public.leads
  FOR DELETE USING (auth.uid() = user_id);

-- AI Booking Reviews: users can only access their own
CREATE POLICY ai_booking_reviews_select_own ON public.ai_booking_reviews
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY ai_booking_reviews_insert_own ON public.ai_booking_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY ai_booking_reviews_update_own ON public.ai_booking_reviews
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- SERVICE ROLE POLICIES (for webhooks/admin)
-- ============================================

-- Customers service role policies
CREATE POLICY customers_service_select ON public.customers
  FOR SELECT TO service_role USING (true);

CREATE POLICY customers_service_insert ON public.customers
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY customers_service_update ON public.customers
  FOR UPDATE TO service_role USING (true);

-- Leads service role policies
CREATE POLICY leads_service_select ON public.leads
  FOR SELECT TO service_role USING (true);

CREATE POLICY leads_service_insert ON public.leads
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY leads_service_update ON public.leads
  FOR UPDATE TO service_role USING (true);

-- AI Booking Reviews service role policies
CREATE POLICY ai_booking_reviews_service_select ON public.ai_booking_reviews
  FOR SELECT TO service_role USING (true);

CREATE POLICY ai_booking_reviews_service_insert ON public.ai_booking_reviews
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY ai_booking_reviews_service_update ON public.ai_booking_reviews
  FOR UPDATE TO service_role USING (true);

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at for customers
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Update updated_at for leads
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- VIEWS
-- ============================================

-- Active leads (not converted or lost, and not snoozed)
CREATE OR REPLACE VIEW public.active_leads AS
SELECT
  l.*,
  CASE
    WHEN l.status = 'callback_requested' THEN 1
    WHEN l.status = 'thinking' THEN 2
    WHEN l.status = 'voicemail_left' THEN 3
    WHEN l.status = 'info_only' THEN 4
    ELSE 5
  END as sort_priority,
  EXTRACT(EPOCH FROM (NOW() - l.created_at)) / 3600 as hours_since_created
FROM public.leads l
WHERE l.status NOT IN ('converted', 'lost')
  AND (l.remind_at IS NULL OR l.remind_at <= NOW());

-- Today's schedule view with customer details
CREATE OR REPLACE VIEW public.today_schedule AS
SELECT
  j.*,
  c.name as customer_display_name,
  c.equipment as customer_equipment,
  c.notes as customer_notes,
  c.lifetime_value as customer_lifetime_value,
  c.total_jobs as customer_total_jobs
FROM public.jobs j
LEFT JOIN public.customers c ON j.customer_id = c.id
WHERE j.status NOT IN ('complete', 'cancelled')
  AND j.scheduled_at IS NOT NULL
  AND DATE(j.scheduled_at AT TIME ZONE 'UTC') = CURRENT_DATE;

-- Pending AI booking reviews
CREATE OR REPLACE VIEW public.pending_booking_reviews AS
SELECT
  abr.*,
  j.customer_name,
  j.customer_phone,
  j.customer_address,
  j.service_type,
  j.urgency,
  j.ai_summary
FROM public.ai_booking_reviews abr
JOIN public.jobs j ON abr.job_id = j.id
WHERE abr.status = 'pending';

-- ============================================
-- ENABLE REALTIME FOR NEW TABLES
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_booking_reviews;

-- ============================================
-- FUNCTION: Update customer stats when job completes
-- ============================================

CREATE OR REPLACE FUNCTION public.update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Only run when job is marked complete
  IF NEW.status = 'complete' AND OLD.status != 'complete' AND NEW.customer_id IS NOT NULL THEN
    UPDATE public.customers
    SET
      total_jobs = total_jobs + 1,
      lifetime_value = lifetime_value + COALESCE(NEW.revenue, 0),
      last_service_at = COALESCE(NEW.completed_at, NOW()),
      updated_at = NOW()
    WHERE id = NEW.customer_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update customer stats on job completion
CREATE TRIGGER update_customer_stats_on_complete
  AFTER UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_customer_stats();

-- CallLock V4: ACTION/BOOKED Model Migration
-- This migration adds the V4 priority color system and outcome tracking

-- =============================================================================
-- PRIORITY COLOR SYSTEM
-- =============================================================================
-- V4 uses a 4-color priority system:
-- - RED: Callback risk (customer frustrated, repeat issue, demanded manager)
-- - GREEN: Commercial/high-value (commercial property, >$1000 job, replacement)
-- - BLUE: Standard residential (default for valid leads)
-- - GRAY: Spam/vendor (sales calls, solicitations)

-- Add priority_color column to leads
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS priority_color TEXT DEFAULT 'blue';

COMMENT ON COLUMN public.leads.priority_color IS 'V4 priority: red (callback_risk), green (commercial), blue (new_lead), gray (spam)';

-- Add priority_reason column (explains why this color was assigned)
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS priority_reason TEXT;

COMMENT ON COLUMN public.leads.priority_reason IS 'Human-readable explanation for priority assignment';

-- =============================================================================
-- OUTCOME TRACKING
-- =============================================================================
-- Track what happened after contractor called back

-- Callback outcome (what happened after the call)
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS callback_outcome TEXT;

COMMENT ON COLUMN public.leads.callback_outcome IS 'Outcome: booked, resolved, try_again, no_answer';

-- When the outcome was recorded
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS callback_outcome_at TIMESTAMPTZ;

-- Optional note about the outcome
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS callback_outcome_note TEXT;

-- =============================================================================
-- CALL TAP TRACKING (for Outcome Prompt)
-- =============================================================================
-- Track when user tapped "Call" to show outcome prompt when they return

ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS last_call_tapped_at TIMESTAMPTZ;

COMMENT ON COLUMN public.leads.last_call_tapped_at IS 'Timestamp of last Call button tap - used to show outcome prompt';

-- =============================================================================
-- TIME PREFERENCE
-- =============================================================================
-- Customer's stated time preference (captured by AI)

ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS time_preference TEXT;

COMMENT ON COLUMN public.leads.time_preference IS 'Customer time preference: tomorrow morning, weekends only, etc.';

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Index for ACTION view (priority-ordered leads needing attention)
CREATE INDEX IF NOT EXISTS idx_leads_action_view
ON public.leads(user_id, priority_color, status)
WHERE status NOT IN ('converted', 'lost');

-- Index for pending outcome detection (leads with recent call taps)
CREATE INDEX IF NOT EXISTS idx_leads_pending_outcome
ON public.leads(user_id, last_call_tapped_at)
WHERE last_call_tapped_at IS NOT NULL;

-- Index for priority color filtering
CREATE INDEX IF NOT EXISTS idx_leads_priority_color
ON public.leads(user_id, priority_color);

-- =============================================================================
-- BACKFILL EXISTING LEADS
-- =============================================================================
-- Set default priority_color for existing leads based on current data

UPDATE public.leads
SET priority_color = CASE
  -- RED: Abandoned calls (customer hung up - high callback risk)
  WHEN status = 'abandoned' THEN 'red'

  -- GREEN: High-value leads (replacement tier or high estimated value)
  WHEN revenue_tier = 'replacement' THEN 'green'
  WHEN revenue_tier_label = '$$$$' THEN 'green'
  WHEN estimated_value > 1000 THEN 'green'
  WHEN status = 'sales_opportunity' THEN 'green'

  -- GRAY: Would need manual review (no automatic spam detection yet)
  -- For now, leave as blue

  -- BLUE: Default for all other valid leads
  ELSE 'blue'
END
WHERE priority_color IS NULL OR priority_color = 'blue';

-- Set priority_reason for backfilled leads
UPDATE public.leads
SET priority_reason = CASE
  WHEN priority_color = 'red' AND status = 'abandoned' THEN 'Customer hung up - may call competitor'
  WHEN priority_color = 'green' AND revenue_tier = 'replacement' THEN 'Replacement opportunity detected'
  WHEN priority_color = 'green' AND status = 'sales_opportunity' THEN 'Sales opportunity - high value'
  WHEN priority_color = 'green' AND estimated_value > 1000 THEN 'High estimated value (>$1000)'
  ELSE NULL
END
WHERE priority_reason IS NULL AND priority_color != 'blue';

-- =============================================================================
-- ADD PRIORITY COLOR TO JOBS TABLE
-- =============================================================================
-- Jobs converted from leads should retain the priority information

ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS priority_color TEXT DEFAULT 'blue';

ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS priority_reason TEXT;

-- =============================================================================
-- FEATURE FLAGS TABLE (for gradual V4 rollout)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  flag_name TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, flag_name)
);

-- Enable RLS
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Users can read their own flags
CREATE POLICY "Users can read own flags"
ON public.feature_flags
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Service role can manage all flags
CREATE POLICY "Service role can manage flags"
ON public.feature_flags
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create index for flag lookups
CREATE INDEX IF NOT EXISTS idx_feature_flags_lookup
ON public.feature_flags(user_id, flag_name);

-- =============================================================================
-- ENABLE REALTIME FOR LEADS (for live updates)
-- =============================================================================
-- Note: This needs to be done via Supabase Dashboard or supabase CLI
-- The leads table should have Realtime enabled for INSERT, UPDATE, DELETE

-- Grant Realtime access (if not already granted)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;

-- ============================================
-- COMPREHENSIVE MIGRATION SCRIPT
-- Run this in Supabase SQL Editor to apply all missing schema
-- ============================================

-- ============================================
-- 0010: Revenue and Diagnostic Fields
-- ============================================

-- Add revenue confidence and extended tier info to jobs table
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS revenue_confidence TEXT,
  ADD COLUMN IF NOT EXISTS revenue_tier_description TEXT,
  ADD COLUMN IF NOT EXISTS revenue_tier_range TEXT;

-- Add diagnostic context fields to jobs table
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS problem_duration TEXT,
  ADD COLUMN IF NOT EXISTS problem_onset TEXT,
  ADD COLUMN IF NOT EXISTS problem_pattern TEXT,
  ADD COLUMN IF NOT EXISTS customer_attempted_fixes TEXT;

-- Add same fields to leads table
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS revenue_confidence TEXT,
  ADD COLUMN IF NOT EXISTS revenue_tier_description TEXT,
  ADD COLUMN IF NOT EXISTS revenue_tier_range TEXT;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS problem_duration TEXT,
  ADD COLUMN IF NOT EXISTS problem_onset TEXT,
  ADD COLUMN IF NOT EXISTS problem_pattern TEXT,
  ADD COLUMN IF NOT EXISTS customer_attempted_fixes TEXT;

-- ============================================
-- 0015: V3 Triage Fields
-- ============================================

-- Caller type classification
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS caller_type TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS primary_intent TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS booking_status TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS is_callback_complaint BOOLEAN DEFAULT false;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS status_color TEXT DEFAULT 'gray';

-- Same for calls table
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS caller_type TEXT;
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS primary_intent TEXT;
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS booking_status TEXT;
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS is_callback_complaint BOOLEAN DEFAULT false;
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS status_color TEXT DEFAULT 'gray';

-- ============================================
-- 0016: V4 Priority Color System
-- ============================================

-- Add priority_color to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS priority_color TEXT DEFAULT 'blue';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS priority_reason TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS callback_outcome TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS callback_outcome_at TIMESTAMPTZ;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS callback_outcome_note TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_call_tapped_at TIMESTAMPTZ;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS time_preference TEXT;

-- Add priority_color to jobs
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS priority_color TEXT DEFAULT 'blue';
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS priority_reason TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS status_color TEXT DEFAULT 'gray';

-- ============================================
-- INDEXES (safe to run multiple times)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_leads_status_color ON public.leads(user_id, status_color)
  WHERE status NOT IN ('converted', 'lost');

CREATE INDEX IF NOT EXISTS idx_calls_status_color ON public.calls(user_id, status_color);

CREATE INDEX IF NOT EXISTS idx_leads_action_view
ON public.leads(user_id, priority_color, status)
WHERE status NOT IN ('converted', 'lost');

CREATE INDEX IF NOT EXISTS idx_leads_pending_outcome
ON public.leads(user_id, last_call_tapped_at)
WHERE last_call_tapped_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_priority_color
ON public.leads(user_id, priority_color);

-- ============================================
-- FEATURE FLAGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  flag_name TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, flag_name)
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'feature_flags' AND policyname = 'Users can read own flags') THEN
    CREATE POLICY "Users can read own flags" ON public.feature_flags FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_feature_flags_lookup ON public.feature_flags(user_id, flag_name);

-- ============================================
-- Done!
-- ============================================
SELECT 'All migrations applied successfully!' as result;

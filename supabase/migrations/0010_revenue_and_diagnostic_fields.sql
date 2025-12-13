-- Extended Revenue Tier Fields and Diagnostic Context
-- These fields capture additional AI classification data and problem diagnostics
-- that the backend sends but dashboard previously didn't store

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

-- Add comments for documentation
COMMENT ON COLUMN public.jobs.revenue_confidence IS 'AI confidence in tier classification: low, medium, high';
COMMENT ON COLUMN public.jobs.revenue_tier_description IS 'Human-readable tier description: Potential Replacement, Major Repair, etc.';
COMMENT ON COLUMN public.jobs.revenue_tier_range IS 'Dollar range estimate: $5,000-$15,000+, $800-$3,000, etc.';
COMMENT ON COLUMN public.jobs.problem_duration IS 'How long the issue has been occurring';
COMMENT ON COLUMN public.jobs.problem_onset IS 'When/how problem started';
COMMENT ON COLUMN public.jobs.problem_pattern IS 'Pattern of the issue: constant, intermittent, etc.';
COMMENT ON COLUMN public.jobs.customer_attempted_fixes IS 'What customer already tried';

COMMENT ON COLUMN public.leads.revenue_confidence IS 'AI confidence in tier classification: low, medium, high';
COMMENT ON COLUMN public.leads.revenue_tier_description IS 'Human-readable tier description: Potential Replacement, Major Repair, etc.';
COMMENT ON COLUMN public.leads.revenue_tier_range IS 'Dollar range estimate: $5,000-$15,000+, $800-$3,000, etc.';
COMMENT ON COLUMN public.leads.problem_duration IS 'How long the issue has been occurring';
COMMENT ON COLUMN public.leads.problem_onset IS 'When/how problem started';
COMMENT ON COLUMN public.leads.problem_pattern IS 'Pattern of the issue: constant, intermittent, etc.';
COMMENT ON COLUMN public.leads.customer_attempted_fixes IS 'What customer already tried';

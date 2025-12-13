-- Revenue Tier Fields for Jobs and Leads
-- These fields store the AI's classification of potential job value

-- Add revenue tier fields to jobs table
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS revenue_tier TEXT,
  ADD COLUMN IF NOT EXISTS revenue_tier_label TEXT,
  ADD COLUMN IF NOT EXISTS revenue_tier_signals TEXT[];

-- Add revenue tier fields to leads table
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS revenue_tier TEXT,
  ADD COLUMN IF NOT EXISTS revenue_tier_label TEXT,
  ADD COLUMN IF NOT EXISTS revenue_tier_signals TEXT[];

-- Add comments for documentation
COMMENT ON COLUMN public.jobs.revenue_tier IS 'AI classification: replacement, major_repair, standard_repair, minor, diagnostic';
COMMENT ON COLUMN public.jobs.revenue_tier_label IS 'Display label: $$$$, $$$, $$, $, $$?';
COMMENT ON COLUMN public.jobs.revenue_tier_signals IS 'Signals that led to classification: R-22 system, 20+ years old, etc.';

COMMENT ON COLUMN public.leads.revenue_tier IS 'AI classification: replacement, major_repair, standard_repair, minor, diagnostic';
COMMENT ON COLUMN public.leads.revenue_tier_label IS 'Display label: $$$$, $$$, $$, $, $$?';
COMMENT ON COLUMN public.leads.revenue_tier_signals IS 'Signals that led to classification: R-22 system, 20+ years old, etc.';

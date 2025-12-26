-- =============================================================================
-- HVAC MUST-HAVE FIELDS (Owner-Operator Decision Support)
-- =============================================================================
-- Fields that HVAC owner-operators need to make dispatch and pricing decisions
-- Source: Enhanced AI agent data collection (Dec 2025)
--
-- These fields answer the core owner-operator questions:
-- 1. Should I take this job? → property_type
-- 2. What's it worth? → equipment_age_bracket
-- 3. What's the problem severity? → system_status
-- 4. Can they authorize work? → is_decision_maker, decision_maker_contact

-- =============================================================================
-- PROPERTY TYPE (Location/Access)
-- =============================================================================
-- Helps with routing: condo on floor 15 vs single-family home
-- Commercial properties get special handling (badge notification + owner escalation)

ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS property_type TEXT
CHECK (property_type IN ('house', 'condo', 'apartment', 'commercial'));

ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS property_type TEXT
CHECK (property_type IN ('house', 'condo', 'apartment', 'commercial'));

COMMENT ON COLUMN public.leads.property_type IS 'Property type for routing: house, condo, apartment, commercial';
COMMENT ON COLUMN public.jobs.property_type IS 'Property type for routing: house, condo, apartment, commercial';

-- =============================================================================
-- SYSTEM STATUS (Problem Clarity)
-- =============================================================================
-- Completely down = emergency triage priority
-- Partially working = may be simple fix (thermostat, capacitor)

ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS system_status TEXT
CHECK (system_status IN ('completely_down', 'partially_working', 'running_but_ineffective'));

ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS system_status TEXT
CHECK (system_status IN ('completely_down', 'partially_working', 'running_but_ineffective'));

COMMENT ON COLUMN public.leads.system_status IS 'System status: completely_down (emergency), partially_working, running_but_ineffective';
COMMENT ON COLUMN public.jobs.system_status IS 'System status: completely_down (emergency), partially_working, running_but_ineffective';

-- =============================================================================
-- EQUIPMENT AGE BRACKET (Revenue Classification)
-- =============================================================================
-- Brackets: under_10 (likely repair), 10_to_15 (approaching replacement), over_15 (replacement likely)
-- Used with revenue_tier for dispatch prioritization

ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS equipment_age_bracket TEXT
CHECK (equipment_age_bracket IN ('under_10', '10_to_15', 'over_15', 'unknown'));

ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS equipment_age_bracket TEXT
CHECK (equipment_age_bracket IN ('under_10', '10_to_15', 'over_15', 'unknown'));

COMMENT ON COLUMN public.leads.equipment_age_bracket IS 'Equipment age bracket: under_10, 10_to_15, over_15, unknown';
COMMENT ON COLUMN public.jobs.equipment_age_bracket IS 'Equipment age bracket: under_10, 10_to_15, over_15, unknown';

-- =============================================================================
-- DECISION MAKER (Authorization)
-- =============================================================================
-- If caller isn't decision maker, needs authorization contact
-- Prevents wasted trips when tenant can't authorize work over threshold

ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS is_decision_maker BOOLEAN;

ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS is_decision_maker BOOLEAN;

ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS decision_maker_contact TEXT;

ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS decision_maker_contact TEXT;

COMMENT ON COLUMN public.leads.is_decision_maker IS 'Caller is decision maker (homeowner/authorized)';
COMMENT ON COLUMN public.jobs.is_decision_maker IS 'Caller is decision maker (homeowner/authorized)';
COMMENT ON COLUMN public.leads.decision_maker_contact IS 'Contact info for actual decision maker (if caller is tenant/manager)';
COMMENT ON COLUMN public.jobs.decision_maker_contact IS 'Contact info for actual decision maker (if caller is tenant/manager)';

-- =============================================================================
-- INDEXES
-- =============================================================================
-- Index for filtering by property_type (common for routing decisions)

CREATE INDEX IF NOT EXISTS idx_leads_property_type
ON public.leads(user_id, property_type)
WHERE property_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_property_type
ON public.jobs(user_id, property_type)
WHERE property_type IS NOT NULL;

-- Index for filtering by equipment_age_bracket (revenue classification)

CREATE INDEX IF NOT EXISTS idx_leads_equipment_age_bracket
ON public.leads(user_id, equipment_age_bracket)
WHERE equipment_age_bracket IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_equipment_age_bracket
ON public.jobs(user_id, equipment_age_bracket)
WHERE equipment_age_bracket IS NOT NULL;

-- Index for non-decision-maker leads (needs authorization handling)

CREATE INDEX IF NOT EXISTS idx_leads_not_decision_maker
ON public.leads(user_id)
WHERE is_decision_maker = false;

-- Index for commercial properties (high-value routing)

CREATE INDEX IF NOT EXISTS idx_leads_commercial
ON public.leads(user_id)
WHERE property_type = 'commercial';

CREATE INDEX IF NOT EXISTS idx_jobs_commercial
ON public.jobs(user_id)
WHERE property_type = 'commercial';

-- Index for system completely down (emergency triage)

CREATE INDEX IF NOT EXISTS idx_leads_system_down
ON public.leads(user_id)
WHERE system_status = 'completely_down';

CREATE INDEX IF NOT EXISTS idx_jobs_system_down
ON public.jobs(user_id)
WHERE system_status = 'completely_down';

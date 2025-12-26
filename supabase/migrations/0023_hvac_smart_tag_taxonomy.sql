-- HVAC Smart Tag Taxonomy Integration
-- Adds tags JSONB column to store full taxonomy tags from V2 backend
-- Backend classifies calls with 117-tag taxonomy and sends via webhook

-- =============================================================================
-- TAGS COLUMN (JSONB)
-- =============================================================================
-- Stores full taxonomy classification from V2 backend
-- Structure: { HAZARD: [...], URGENCY: [...], SERVICE_TYPE: [...], REVENUE: [...], ... }

ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT NULL;

ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT NULL;

COMMENT ON COLUMN public.leads.tags IS 'HVAC taxonomy tags from V2 backend: { HAZARD, URGENCY, SERVICE_TYPE, REVENUE, RECOVERY, LOGISTICS, CUSTOMER, NON_CUSTOMER, CONTEXT }';
COMMENT ON COLUMN public.jobs.tags IS 'HVAC taxonomy tags from V2 backend: { HAZARD, URGENCY, SERVICE_TYPE, REVENUE, RECOVERY, LOGISTICS, CUSTOMER, NON_CUSTOMER, CONTEXT }';

-- =============================================================================
-- GIN INDEX FOR JSONB QUERIES
-- =============================================================================
-- Enables fast queries on tag contents (e.g., find all leads with GAS_LEAK tag)

CREATE INDEX IF NOT EXISTS idx_leads_tags_gin
ON public.leads USING GIN (tags);

CREATE INDEX IF NOT EXISTS idx_jobs_tags_gin
ON public.jobs USING GIN (tags);

-- =============================================================================
-- HELPER FUNCTION: Check if item has a specific tag
-- =============================================================================

CREATE OR REPLACE FUNCTION public.has_tag(item_tags JSONB, category TEXT, tag_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(item_tags->category->>tag_name, 'false')::BOOLEAN;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================================================
-- HELPER FUNCTION: Extract all tags from a category
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_category_tags(item_tags JSONB, category TEXT)
RETURNS TEXT[] AS $$
BEGIN
  RETURN (SELECT array_agg(key)
          FROM jsonb_each_text(COALESCE(item_tags->category, '{}'::jsonb))
          WHERE value::BOOLEAN = true);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

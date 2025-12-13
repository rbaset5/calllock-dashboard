-- Migration: Add sales lead notes and equipment info to leads table
-- These fields capture important context from sales calls that was previously lost

-- Add sales lead notes column
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS sales_lead_notes TEXT;

-- Add equipment info columns (useful context for sales leads)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS equipment_type TEXT;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS equipment_age TEXT;

-- Add comment explaining the columns
COMMENT ON COLUMN public.leads.sales_lead_notes IS 'Notes collected during sales/replacement inquiry calls';
COMMENT ON COLUMN public.leads.equipment_type IS 'Type of equipment customer wants to replace (AC, furnace, etc.)';
COMMENT ON COLUMN public.leads.equipment_age IS 'Age of equipment (e.g., "20 years", "15+ years")';

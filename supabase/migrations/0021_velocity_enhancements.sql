-- Velocity System Enhancements Migration
-- Adds sentiment_score (1-5) and work_type enum to leads and jobs

-- =============================================================================
-- SENTIMENT SCORE (1-5 scale)
-- =============================================================================
-- Derived from transcript analysis by V2 backend
-- 1 = Very Negative, 2 = Negative, 3 = Neutral, 4 = Positive, 5 = Very Positive

ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS sentiment_score INTEGER
CHECK (sentiment_score >= 1 AND sentiment_score <= 5);

ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS sentiment_score INTEGER
CHECK (sentiment_score >= 1 AND sentiment_score <= 5);

COMMENT ON COLUMN public.leads.sentiment_score IS 'Customer sentiment 1-5: 1=very negative, 3=neutral, 5=very positive';
COMMENT ON COLUMN public.jobs.sentiment_score IS 'Customer sentiment 1-5: 1=very negative, 3=neutral, 5=very positive';

-- =============================================================================
-- WORK TYPE ENUM
-- =============================================================================
-- Classification of work: service, maintenance, install, admin
-- Used for filtering and future routing

ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS work_type TEXT
CHECK (work_type IN ('service', 'maintenance', 'install', 'admin'));

ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS work_type TEXT
CHECK (work_type IN ('service', 'maintenance', 'install', 'admin'));

COMMENT ON COLUMN public.leads.work_type IS 'Work classification: service, maintenance, install, or admin';
COMMENT ON COLUMN public.jobs.work_type IS 'Work classification: service, maintenance, install, or admin';

-- =============================================================================
-- INDEXES
-- =============================================================================
-- Index for filtering by work_type (common filter operation)

CREATE INDEX IF NOT EXISTS idx_leads_work_type
ON public.leads(user_id, work_type)
WHERE work_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_work_type
ON public.jobs(user_id, work_type)
WHERE work_type IS NOT NULL;

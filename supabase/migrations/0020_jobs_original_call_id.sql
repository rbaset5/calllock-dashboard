-- Add original_call_id to jobs table for webhook deduplication
-- This allows the jobs webhook to detect duplicate calls and update instead of creating new records

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS original_call_id TEXT;

-- Create index for efficient lookup during deduplication
CREATE INDEX IF NOT EXISTS idx_jobs_original_call_id ON jobs(user_id, original_call_id)
WHERE original_call_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN jobs.original_call_id IS 'Retell call ID for webhook deduplication - links job to original call record';

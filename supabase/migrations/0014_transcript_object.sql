-- Add structured transcript to calls table
-- This stores the speaker-labeled transcript object from Retell

ALTER TABLE public.calls
ADD COLUMN IF NOT EXISTS transcript_object JSONB;

-- Add comment for documentation
COMMENT ON COLUMN public.calls.transcript_object IS 'Structured transcript with speaker labels: [{role: "agent"|"user", content: "..."}]';

-- Add GIN index for potential text search within transcript
CREATE INDEX IF NOT EXISTS idx_calls_transcript_object
ON public.calls USING GIN (transcript_object);

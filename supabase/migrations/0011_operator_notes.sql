-- Operator Notes Table
-- Stores notes from operators/dispatchers about customers
-- Synced from backend when AI fetches customer status, or created directly in dashboard

CREATE TABLE IF NOT EXISTS public.operator_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  note_text TEXT NOT NULL,
  created_by TEXT,                    -- Operator email or name
  expires_at TIMESTAMPTZ,             -- Optional expiration for temporary notes
  is_active BOOLEAN DEFAULT true,
  -- Link to related records
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  -- Sync tracking
  synced_from_backend BOOLEAN DEFAULT false,
  backend_note_id TEXT,               -- ID from backend if synced
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by phone
CREATE INDEX IF NOT EXISTS idx_operator_notes_phone ON public.operator_notes(customer_phone);
CREATE INDEX IF NOT EXISTS idx_operator_notes_user ON public.operator_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_operator_notes_active ON public.operator_notes(user_id, is_active) WHERE is_active = true;

-- RLS policies
ALTER TABLE public.operator_notes ENABLE ROW LEVEL SECURITY;

-- Users can read their own notes
CREATE POLICY "Users can read own notes" ON public.operator_notes
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own notes
CREATE POLICY "Users can insert own notes" ON public.operator_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own notes
CREATE POLICY "Users can update own notes" ON public.operator_notes
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own notes
CREATE POLICY "Users can delete own notes" ON public.operator_notes
  FOR DELETE USING (auth.uid() = user_id);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_operator_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_operator_notes_updated_at
  BEFORE UPDATE ON public.operator_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_operator_notes_updated_at();

-- Comments
COMMENT ON TABLE public.operator_notes IS 'Operator/dispatcher notes about customers, synced from backend or created in dashboard';
COMMENT ON COLUMN public.operator_notes.expires_at IS 'Optional expiration for temporary notes (e.g., "Customer prefers morning calls this week")';
COMMENT ON COLUMN public.operator_notes.created_by IS 'Operator email or name who created the note';
COMMENT ON COLUMN public.operator_notes.synced_from_backend IS 'True if note was synced from backend customer_notes table';

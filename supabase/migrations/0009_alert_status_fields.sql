-- Add status tracking fields to sms_alert_context table
-- This allows tracking whether alerts have been responded to by dispatchers

-- Add user_id for RLS and filtering (get from lead/job)
ALTER TABLE public.sms_alert_context
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;

-- Add status field to track alert lifecycle
ALTER TABLE public.sms_alert_context
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
-- Values: 'pending', 'replied', 'resolved', 'expired'

-- Add replied_at timestamp
ALTER TABLE public.sms_alert_context
ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ;

-- Add reply_code to store the dispatcher's response
ALTER TABLE public.sms_alert_context
ADD COLUMN IF NOT EXISTS reply_code TEXT;
-- Values: '1' (Called), '2' (VM), '3' (Note), '4' (Booked), '5' (Lost)

-- Add index for filtering by status
CREATE INDEX IF NOT EXISTS idx_sms_alert_context_status
ON public.sms_alert_context(status, created_at DESC);

-- Add index for finding pending alerts per user
CREATE INDEX IF NOT EXISTS idx_sms_alert_context_user_status
ON public.sms_alert_context(user_id, status);

-- Comment on columns
COMMENT ON COLUMN public.sms_alert_context.user_id IS 'Business owner user ID for RLS';
COMMENT ON COLUMN public.sms_alert_context.status IS 'Alert status: pending, replied, resolved, expired';
COMMENT ON COLUMN public.sms_alert_context.replied_at IS 'When dispatcher replied to the alert';
COMMENT ON COLUMN public.sms_alert_context.reply_code IS 'Dispatcher reply code: 1=Called, 2=VM, 3=Note, 4=Booked, 5=Lost';

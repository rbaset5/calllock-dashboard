-- CallLock SMS Notification Preferences & Queue
-- Migration: 0003_notification_preferences.sql
-- Adds operator notification preferences and quiet hours queue

-- ============================================
-- NOTIFICATION PREFERENCES TABLE
-- Per-operator SMS notification settings
-- ============================================

CREATE TABLE public.operator_notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Notification toggles per event type
  sms_same_day_booking BOOLEAN NOT NULL DEFAULT true,
  sms_future_booking BOOLEAN NOT NULL DEFAULT false,
  sms_callback_request BOOLEAN NOT NULL DEFAULT true,
  sms_schedule_conflict BOOLEAN NOT NULL DEFAULT true,
  sms_cancellation BOOLEAN NOT NULL DEFAULT true,

  -- Quiet hours (stored as HH:MM in 24-hour format)
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT true,
  quiet_hours_start TIME NOT NULL DEFAULT '19:00',
  quiet_hours_end TIME NOT NULL DEFAULT '06:00',

  -- STOP compliance (legal requirement)
  sms_unsubscribed BOOLEAN NOT NULL DEFAULT false,
  sms_unsubscribed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One preferences record per user
  CONSTRAINT unique_user_notification_prefs UNIQUE (user_id)
);

-- Index for quick lookups
CREATE INDEX idx_notification_prefs_user ON public.operator_notification_preferences(user_id);

-- Auto-update timestamp
CREATE TRIGGER update_notification_prefs_updated_at
  BEFORE UPDATE ON public.operator_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- NOTIFICATION QUEUE TABLE
-- Queue for messages during quiet hours
-- ============================================

CREATE TABLE public.notification_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,

  -- Event type for filtering/debugging
  event_type TEXT NOT NULL CHECK (event_type IN (
    'same_day_booking',
    'future_booking',
    'callback_request',
    'schedule_conflict',
    'cancellation'
  )),

  -- Pre-formatted message ready to send
  message_body TEXT NOT NULL,

  -- Scheduling
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  send_at TIMESTAMPTZ NOT NULL,  -- When quiet hours end
  sent_at TIMESTAMPTZ,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed', 'cancelled')),
  error_message TEXT,
  twilio_sid TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queue processing
CREATE INDEX idx_queue_user_status ON public.notification_queue(user_id, status);
CREATE INDEX idx_queue_pending ON public.notification_queue(send_at, status)
  WHERE status = 'queued';
CREATE INDEX idx_queue_job ON public.notification_queue(job_id) WHERE job_id IS NOT NULL;

-- ============================================
-- EXTEND SMS_LOG TABLE
-- Add event type and delivery status tracking
-- ============================================

ALTER TABLE public.sms_log
  ADD COLUMN IF NOT EXISTS event_type TEXT CHECK (event_type IN (
    'same_day_booking',
    'future_booking',
    'callback_request',
    'schedule_conflict',
    'cancellation',
    'reply_confirmation',
    'reply_customer_phone',
    'stale_job_alert',
    'complete_confirmation',
    'other'
  ));

-- Twilio delivery status webhook tracking
ALTER TABLE public.sms_log
  ADD COLUMN IF NOT EXISTS delivery_status TEXT,
  ADD COLUMN IF NOT EXISTS delivery_status_updated_at TIMESTAMPTZ;

-- Index for delivery status lookups
CREATE INDEX IF NOT EXISTS idx_sms_log_twilio_sid ON public.sms_log(twilio_sid)
  WHERE twilio_sid IS NOT NULL;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.operator_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

-- User policies for preferences
CREATE POLICY prefs_select_own ON public.operator_notification_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY prefs_insert_own ON public.operator_notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY prefs_update_own ON public.operator_notification_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- Service role policies for preferences (webhooks/admin)
CREATE POLICY prefs_service_select ON public.operator_notification_preferences
  FOR SELECT TO service_role USING (true);

CREATE POLICY prefs_service_insert ON public.operator_notification_preferences
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY prefs_service_update ON public.operator_notification_preferences
  FOR UPDATE TO service_role USING (true);

-- Queue is only accessed by service role (cron/webhooks)
CREATE POLICY queue_service_all ON public.notification_queue
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Users can view their own queued notifications (read-only)
CREATE POLICY queue_user_select ON public.notification_queue
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- AUTO-CREATE PREFERENCES FOR NEW USERS
-- ============================================

-- Function to create default preferences
CREATE OR REPLACE FUNCTION public.create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.operator_notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create preferences when user profile is created
CREATE TRIGGER create_notification_prefs_on_user_insert
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_notification_preferences();

-- ============================================
-- BACKFILL EXISTING USERS
-- Create preferences for any existing users
-- ============================================

INSERT INTO public.operator_notification_preferences (user_id)
SELECT id FROM public.users
WHERE id NOT IN (SELECT user_id FROM public.operator_notification_preferences)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- ENABLE REALTIME
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.operator_notification_preferences;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_queue;

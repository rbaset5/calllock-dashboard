-- Push Notification Subscriptions
-- Stores Web Push subscriptions for each user

-- ============================================
-- PUSH SUBSCRIPTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  expiration_time BIGINT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own push subscriptions"
  ON public.push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push subscriptions"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own push subscriptions"
  ON public.push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can manage all subscriptions (for push sending)
CREATE POLICY "Service role can manage push subscriptions"
  ON public.push_subscriptions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
  ON public.push_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint
  ON public.push_subscriptions(endpoint);

-- ============================================
-- NOTIFICATION HISTORY TABLE
-- Track sent notifications for debugging/analytics
-- ============================================

CREATE TABLE IF NOT EXISTS public.notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.push_subscriptions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  priority TEXT DEFAULT 'standard',
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'clicked', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own notification history"
  ON public.notification_history FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage notification history
CREATE POLICY "Service role can manage notification history"
  ON public.notification_history FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Index for recent notifications
CREATE INDEX IF NOT EXISTS idx_notification_history_user_date
  ON public.notification_history(user_id, created_at DESC);

-- ============================================
-- ADD PUSH PREFERENCE TO USERS
-- ============================================

ALTER TABLE public.operator_notification_preferences
  ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.operator_notification_preferences.push_enabled IS
  'Whether user has enabled web push notifications';

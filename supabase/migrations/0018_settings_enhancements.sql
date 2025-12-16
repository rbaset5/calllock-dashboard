-- V4 Settings Enhancements
-- Adds urgent bypass preference and service role policies for settings APIs

-- ============================================
-- NOTIFICATION PREFERENCES ENHANCEMENTS
-- ============================================

-- Add urgent bypass preference for V4 notification tiers
ALTER TABLE public.operator_notification_preferences
  ADD COLUMN IF NOT EXISTS urgent_bypass_quiet_hours BOOLEAN DEFAULT true;

-- Comment explaining the field
COMMENT ON COLUMN public.operator_notification_preferences.urgent_bypass_quiet_hours IS
  'When true, URGENT tier notifications (callback risks, commercial leads) bypass quiet hours';

-- ============================================
-- SERVICE ROLE POLICIES FOR SETTINGS APIS
-- ============================================

-- Service role can manage business hours (for settings API)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'business_hours'
    AND policyname = 'Service role can manage business hours'
  ) THEN
    CREATE POLICY "Service role can manage business hours"
      ON public.business_hours FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Service role can manage service areas (for settings API)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'service_areas'
    AND policyname = 'Service role can manage service areas'
  ) THEN
    CREATE POLICY "Service role can manage service areas"
      ON public.service_areas FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- ============================================
-- INDEXES FOR SETTINGS QUERIES
-- ============================================

-- Index for efficient service area lookups by user
CREATE INDEX IF NOT EXISTS idx_service_areas_user_zip
  ON public.service_areas(user_id, zip_code);

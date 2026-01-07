-- Migration: Add getting_cold_threshold_hours user preference
-- This allows users to configure when leads are marked as "getting cold"

-- Add getting_cold_threshold_hours to operator_notification_preferences
ALTER TABLE operator_notification_preferences
ADD COLUMN IF NOT EXISTS getting_cold_threshold_hours INTEGER DEFAULT 24;

COMMENT ON COLUMN operator_notification_preferences.getting_cold_threshold_hours 
IS 'Hours after which a lead is marked as "getting cold" in the NOW tab (default: 24)';

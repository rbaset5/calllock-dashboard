-- CallLock Dashboard: Add abandoned lead status
-- Migration: 0004_add_abandoned_lead_status.sql
-- Adds 'abandoned' status to lead_status enum for tracking customer hangups

-- ============================================
-- ADD ABANDONED STATUS TO LEAD_STATUS ENUM
-- ============================================

-- PostgreSQL enums can have new values added using ALTER TYPE
ALTER TYPE lead_status ADD VALUE 'abandoned';

-- Add comment explaining the status
COMMENT ON TYPE lead_status IS 'Lead status values: callback_requested (hot), thinking (warm), voicemail_left (follow-up), info_only (info request), deferred (snoozed), converted (became job), lost (marked lost), abandoned (customer hung up)';

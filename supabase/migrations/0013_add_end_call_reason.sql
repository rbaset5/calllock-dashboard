-- Add end_call_reason column to preserve original call outcome granularity
-- The backend sends 11 different end_call_reasons, but they get mapped to 8 lead statuses
-- This column preserves the original reason for display context

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS end_call_reason TEXT;

COMMENT ON COLUMN public.leads.end_call_reason IS
  'Original end call reason from backend: wrong_number, callback_later, safety_emergency, urgent_escalation, out_of_area, waitlist_added, completed, customer_hangup, sales_lead, cancelled, rescheduled';

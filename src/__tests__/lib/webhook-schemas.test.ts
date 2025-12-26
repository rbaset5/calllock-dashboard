import { describe, it, expect } from 'vitest';
import {
  jobsWebhookSchema,
  callsWebhookSchema,
  emergencyAlertsWebhookSchema,
  emergencyAlertsPatchSchema,
  operatorNotesWebhookSchema,
  validateWebhookPayload,
} from '@/lib/schemas/webhook-schemas';

describe('webhook-schemas', () => {
  describe('jobsWebhookSchema', () => {
    it('should validate a minimal valid payload', () => {
      const payload = {
        customer_name: 'John Doe',
        customer_phone: '+1234567890',
        customer_address: '123 Main St',
        service_type: 'hvac',
        urgency: 'medium',
        user_email: 'test@example.com',
      };

      const result = jobsWebhookSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should validate a full payload with all optional fields', () => {
      const payload = {
        customer_name: 'John Doe',
        customer_phone: '+1234567890',
        customer_address: '123 Main St',
        service_type: 'hvac',
        urgency: 'high',
        user_email: 'test@example.com',
        ai_summary: 'Customer needs AC repair',
        scheduled_at: '2024-12-20T10:00:00Z',
        call_transcript: 'Agent: Hello...',
        estimated_value: 500,
        revenue_confidence: 'medium',
        end_call_reason: 'callback_later',
        issue_description: 'AC not cooling',
        revenue_tier: 'standard_repair',
        revenue_tier_label: '$$',
        revenue_tier_signals: ['residential', 'repair'],
        call_id: 'call_123',
        caller_type: 'residential',
        primary_intent: 'new_lead',
        booking_status: 'not_requested',
        is_callback_complaint: false,
        status_color: 'blue',
        is_archived: false,
      };

      const result = jobsWebhookSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should reject missing required fields', () => {
      const payload = {
        customer_name: 'John Doe',
        // missing other required fields
      };

      const result = jobsWebhookSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject invalid service_type', () => {
      const payload = {
        customer_name: 'John Doe',
        customer_phone: '+1234567890',
        customer_address: '123 Main St',
        service_type: 'invalid_type',
        urgency: 'medium',
        user_email: 'test@example.com',
      };

      const result = jobsWebhookSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject invalid email format', () => {
      const payload = {
        customer_name: 'John Doe',
        customer_phone: '+1234567890',
        customer_address: '123 Main St',
        service_type: 'hvac',
        urgency: 'medium',
        user_email: 'not-an-email',
      };

      const result = jobsWebhookSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject empty customer_name', () => {
      const payload = {
        customer_name: '',
        customer_phone: '+1234567890',
        customer_address: '123 Main St',
        service_type: 'hvac',
        urgency: 'medium',
        user_email: 'test@example.com',
      };

      const result = jobsWebhookSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('callsWebhookSchema', () => {
    it('should validate a minimal valid payload', () => {
      const payload = {
        call_id: 'call_123',
        phone_number: '+1234567890',
        user_email: 'test@example.com',
        started_at: '2024-12-20T10:00:00Z',
      };

      const result = callsWebhookSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should validate a full payload with transcript', () => {
      const payload = {
        call_id: 'call_123',
        retell_call_id: 'retell_456',
        phone_number: '+1234567890',
        customer_name: 'John Doe',
        user_email: 'test@example.com',
        started_at: '2024-12-20T10:00:00Z',
        ended_at: '2024-12-20T10:05:00Z',
        duration_seconds: 300,
        direction: 'inbound',
        outcome: 'completed',
        transcript_object: [
          { role: 'agent', content: 'Hello, how can I help you?' },
          { role: 'user', content: 'My AC is broken' },
        ],
      };

      const result = callsWebhookSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should reject invalid transcript role', () => {
      const payload = {
        call_id: 'call_123',
        phone_number: '+1234567890',
        user_email: 'test@example.com',
        started_at: '2024-12-20T10:00:00Z',
        transcript_object: [
          { role: 'invalid_role', content: 'Hello' },
        ],
      };

      const result = callsWebhookSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject negative duration', () => {
      const payload = {
        call_id: 'call_123',
        phone_number: '+1234567890',
        user_email: 'test@example.com',
        started_at: '2024-12-20T10:00:00Z',
        duration_seconds: -1,
      };

      const result = callsWebhookSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('emergencyAlertsWebhookSchema', () => {
    it('should validate a minimal valid payload', () => {
      const payload = {
        phone_number: '+1234567890',
        problem_description: 'Gas leak detected',
        user_email: 'test@example.com',
        sms_sent_at: '2024-12-20T10:00:00Z',
        callback_promised_minutes: 15,
      };

      const result = emergencyAlertsWebhookSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should validate a full payload', () => {
      const payload = {
        alert_id: 'alert_123',
        call_id: 'call_456',
        phone_number: '+1234567890',
        customer_name: 'John Doe',
        customer_address: '123 Main St',
        urgency_tier: 'Tier 2',
        problem_description: 'Gas leak detected',
        user_email: 'test@example.com',
        sms_sent_at: '2024-12-20T10:00:00Z',
        sms_message_sid: 'SM123',
        callback_promised_minutes: 15,
      };

      const result = emergencyAlertsWebhookSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should reject zero callback_promised_minutes', () => {
      const payload = {
        phone_number: '+1234567890',
        problem_description: 'Gas leak detected',
        user_email: 'test@example.com',
        sms_sent_at: '2024-12-20T10:00:00Z',
        callback_promised_minutes: 0,
      };

      const result = emergencyAlertsWebhookSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('emergencyAlertsPatchSchema', () => {
    it('should validate update with alert_id', () => {
      const payload = {
        alert_id: 'alert_123',
        callback_status: 'delivered',
      };

      const result = emergencyAlertsPatchSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should validate update with backend_alert_id', () => {
      const payload = {
        backend_alert_id: 'backend_123',
        resolved_at: '2024-12-20T10:30:00Z',
        resolution_notes: 'Customer called back',
      };

      const result = emergencyAlertsPatchSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should reject payload without alert_id or backend_alert_id', () => {
      const payload = {
        callback_status: 'delivered',
      };

      const result = emergencyAlertsPatchSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('operatorNotesWebhookSchema', () => {
    it('should validate a minimal valid payload', () => {
      const payload = {
        customer_phone: '+1234567890',
        note_text: 'Customer prefers morning appointments',
        user_email: 'test@example.com',
      };

      const result = operatorNotesWebhookSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should validate a full payload', () => {
      const payload = {
        customer_phone: '+1234567890',
        customer_name: 'John Doe',
        note_text: 'Customer prefers morning appointments',
        user_email: 'test@example.com',
        created_by: 'operator@company.com',
        expires_at: '2025-01-20T10:00:00Z',
        is_active: true,
        backend_note_id: 'note_123',
        job_id: 'job_456',
        lead_id: 'lead_789',
      };

      const result = operatorNotesWebhookSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should reject empty note_text', () => {
      const payload = {
        customer_phone: '+1234567890',
        note_text: '',
        user_email: 'test@example.com',
      };

      const result = operatorNotesWebhookSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('validateWebhookPayload helper', () => {
    it('should return success with data for valid payload', () => {
      const payload = {
        customer_phone: '+1234567890',
        note_text: 'Test note',
        user_email: 'test@example.com',
      };

      const result = validateWebhookPayload(operatorNotesWebhookSchema, payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.customer_phone).toBe('+1234567890');
      }
    });

    it('should return error with details for invalid payload', () => {
      const payload = {
        customer_phone: '+1234567890',
        // missing note_text
        user_email: 'test@example.com',
      };

      const result = validateWebhookPayload(operatorNotesWebhookSchema, payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Validation failed');
        expect(result.details.length).toBeGreaterThan(0);
      }
    });
  });
});

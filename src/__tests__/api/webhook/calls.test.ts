import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the external dependencies
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import { POST, GET } from '@/app/api/webhook/calls/route';
import { createAdminClient } from '@/lib/supabase/admin';

describe('POST /api/webhook/calls', () => {
  const mockUser = {
    id: 'user-123',
  };

  const validCallPayload = {
    call_id: 'call_abc123',
    phone_number: '+15559876543',
    user_email: 'test@example.com',
    started_at: '2024-12-20T10:00:00Z',
    ended_at: '2024-12-20T10:05:00Z',
    duration_seconds: 300,
    direction: 'inbound',
    outcome: 'booking_completed',
    customer_name: 'John Smith',
    hvac_issue_type: 'cooling',
    urgency_tier: 'high',
    problem_description: 'AC not cooling properly',
    revenue_tier_label: '$$',
    transcript_object: [
      { role: 'agent', content: 'Hello, how can I help?' },
      { role: 'user', content: 'My AC is broken.' },
    ],
  };

  function createRequest(body: unknown, headers: Record<string, string> = {}) {
    return new NextRequest('http://localhost:3000/api/webhook/calls', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authentication', () => {
    it('should reject requests without webhook secret', async () => {
      const request = createRequest(validCallPayload);
      const response = await POST(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('should reject requests with invalid webhook secret', async () => {
      const request = createRequest(validCallPayload, {
        'X-Webhook-Secret': 'wrong-secret',
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
    });
  });

  describe('validation', () => {
    it('should reject requests missing call_id', async () => {
      const incompletePayload = {
        phone_number: '+15559876543',
        user_email: 'test@example.com',
        started_at: '2024-12-20T10:00:00Z',
      };

      const request = createRequest(incompletePayload, {
        'X-Webhook-Secret': 'test-webhook-secret',
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Validation failed');
      expect(body.details).toBeDefined();
      expect(body.details.some((d: { path: string }) => d.path === 'call_id')).toBe(true);
    });

    it('should reject requests missing phone_number', async () => {
      const incompletePayload = {
        call_id: 'call_123',
        user_email: 'test@example.com',
        started_at: '2024-12-20T10:00:00Z',
      };

      const request = createRequest(incompletePayload, {
        'X-Webhook-Secret': 'test-webhook-secret',
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should reject requests missing user_email', async () => {
      const incompletePayload = {
        call_id: 'call_123',
        phone_number: '+15559876543',
        started_at: '2024-12-20T10:00:00Z',
      };

      const request = createRequest(incompletePayload, {
        'X-Webhook-Secret': 'test-webhook-secret',
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should reject requests missing started_at', async () => {
      const incompletePayload = {
        call_id: 'call_123',
        phone_number: '+15559876543',
        user_email: 'test@example.com',
      };

      const request = createRequest(incompletePayload, {
        'X-Webhook-Secret': 'test-webhook-secret',
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });

  describe('user lookup', () => {
    it('should return 404 if user not found', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
        }),
      };

      vi.mocked(createAdminClient).mockReturnValue(mockSupabase as never);

      const request = createRequest(validCallPayload, {
        'X-Webhook-Secret': 'test-webhook-secret',
      });
      const response = await POST(request);

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('User not found');
    });
  });

  describe('call creation', () => {
    it('should create a new call record', async () => {
      const mockCall = {
        id: 'call-record-123',
        call_id: 'call_abc123',
        phone_number: '+15559876543',
      };

      // Track call order to distinguish dedup check from insert
      let callOrder = 0;
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'users') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
            };
          }
          if (table === 'calls') {
            callOrder++;
            const currentCall = callOrder;
            return {
              select: vi.fn().mockReturnThis(),
              insert: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockImplementation(() => {
                if (currentCall === 1) {
                  // First call: dedup check - no existing
                  return Promise.resolve({ data: null, error: null });
                }
                // Second call: insert result
                return Promise.resolve({ data: mockCall, error: null });
              }),
            };
          }
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }),
      };

      vi.mocked(createAdminClient).mockReturnValue(mockSupabase as never);

      const request = createRequest(validCallPayload, {
        'X-Webhook-Secret': 'test-webhook-secret',
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.action).toBe('created');
      expect(body.call_id).toBe('call-record-123');
    });
  });

  describe('deduplication', () => {
    it('should update existing call instead of creating duplicate', async () => {
      const existingCall = { id: 'existing-call-id' };
      const updatedCall = {
        id: 'existing-call-id',
        duration_seconds: 300,
        outcome: 'booking_completed',
      };

      let isFirstQuery = true;
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'users') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
            };
          }
          if (table === 'calls') {
            return {
              select: vi.fn().mockReturnThis(),
              insert: vi.fn().mockReturnThis(),
              update: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockImplementation(() => {
                if (isFirstQuery) {
                  isFirstQuery = false;
                  // First call: check for existing
                  return Promise.resolve({ data: existingCall, error: null });
                }
                // Second call: update result
                return Promise.resolve({ data: updatedCall, error: null });
              }),
            };
          }
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }),
      };

      vi.mocked(createAdminClient).mockReturnValue(mockSupabase as never);

      const request = createRequest(validCallPayload, {
        'X-Webhook-Secret': 'test-webhook-secret',
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.action).toBe('updated');
    });
  });

  describe('transcript handling', () => {
    it('should store transcript_object correctly', async () => {
      const mockCall = {
        id: 'call-123',
        transcript_object: validCallPayload.transcript_object,
      };

      // Track call order to distinguish dedup check from insert
      let callOrder = 0;
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'users') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
            };
          }
          if (table === 'calls') {
            callOrder++;
            const currentCall = callOrder;
            return {
              select: vi.fn().mockReturnThis(),
              insert: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockImplementation(() => {
                if (currentCall === 1) {
                  // First call: dedup check - no existing
                  return Promise.resolve({ data: null, error: null });
                }
                // Second call: insert result
                return Promise.resolve({ data: mockCall, error: null });
              }),
            };
          }
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }),
      };

      vi.mocked(createAdminClient).mockReturnValue(mockSupabase as never);

      const request = createRequest(validCallPayload, {
        'X-Webhook-Secret': 'test-webhook-secret',
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  describe('error handling', () => {
    it('should handle database insert errors', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'users') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
            };
          }
          if (table === 'calls') {
            return {
              select: vi.fn().mockReturnThis(),
              insert: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Insert failed' },
              }),
            };
          }
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }),
      };

      vi.mocked(createAdminClient).mockReturnValue(mockSupabase as never);

      const request = createRequest(validCallPayload, {
        'X-Webhook-Secret': 'test-webhook-secret',
      });
      const response = await POST(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Failed to create call');
    });

    it('should handle database update errors', async () => {
      const existingCall = { id: 'existing-call-id' };

      let isFirstQuery = true;
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'users') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
            };
          }
          if (table === 'calls') {
            return {
              select: vi.fn().mockReturnThis(),
              insert: vi.fn().mockReturnThis(),
              update: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockImplementation(() => {
                if (isFirstQuery) {
                  isFirstQuery = false;
                  return Promise.resolve({ data: existingCall, error: null });
                }
                return Promise.resolve({
                  data: null,
                  error: { message: 'Update failed' },
                });
              }),
            };
          }
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }),
      };

      vi.mocked(createAdminClient).mockReturnValue(mockSupabase as never);

      const request = createRequest(validCallPayload, {
        'X-Webhook-Secret': 'test-webhook-secret',
      });
      const response = await POST(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Failed to update call');
    });
  });
});

describe('GET /api/webhook/calls', () => {
  it('should return health check status', async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
  });
});

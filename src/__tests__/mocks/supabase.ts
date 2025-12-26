import { vi } from 'vitest';

// Mock Supabase query builder pattern
export function createMockQueryBuilder(data: unknown, error: unknown = null) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  };
  return builder;
}

// Create mock Supabase client
export function createMockSupabaseClient() {
  return {
    from: vi.fn((table: string) => createMockQueryBuilder(null)),
    auth: {
      admin: {
        listUsers: vi.fn().mockResolvedValue({ data: { users: [] }, error: null }),
      },
    },
  };
}

// Pre-configured mock responses
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  phone: '+15551234567',
  timezone: 'America/New_York',
};

export const mockLead = {
  id: 'test-lead-id',
  user_id: 'test-user-id',
  customer_name: 'Test Customer',
  customer_phone: '+15559876543',
  customer_address: '123 Test St',
  status: 'callback_requested',
  priority: 'hot',
  created_at: new Date().toISOString(),
};

export const mockJob = {
  id: 'test-job-id',
  user_id: 'test-user-id',
  customer_name: 'Test Customer',
  customer_phone: '+15559876543',
  customer_address: '123 Test St',
  service_type: 'hvac',
  urgency: 'high',
  scheduled_at: '2024-12-21T14:00:00Z',
  status: 'new',
  is_ai_booked: true,
  created_at: new Date().toISOString(),
};

export const mockCall = {
  id: 'test-call-id',
  user_id: 'test-user-id',
  call_id: 'call_123',
  phone_number: '+15559876543',
  started_at: new Date().toISOString(),
  direction: 'inbound',
  backend_call_id: 'call_123',
};

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { validateWebhookAuth, withWebhookAuth } from '@/lib/middleware/webhook-auth';

describe('webhook-auth middleware', () => {
  beforeEach(() => {
    vi.stubEnv('WEBHOOK_SECRET', 'test-webhook-secret');
  });

  describe('validateWebhookAuth', () => {
    it('should return null for valid webhook secret', () => {
      const request = new NextRequest('http://localhost/api/webhook/test', {
        headers: {
          'X-Webhook-Secret': 'test-webhook-secret',
        },
      });

      const result = validateWebhookAuth(request);
      expect(result).toBeNull();
    });

    it('should return 401 for missing webhook secret', async () => {
      const request = new NextRequest('http://localhost/api/webhook/test');

      const result = validateWebhookAuth(request);
      expect(result).not.toBeNull();
      expect(result!.status).toBe(401);

      const body = await result!.json();
      expect(body.error).toBe('Unauthorized');
      expect(body.message).toContain('Missing');
    });

    it('should return 401 for invalid webhook secret', async () => {
      const request = new NextRequest('http://localhost/api/webhook/test', {
        headers: {
          'X-Webhook-Secret': 'wrong-secret',
        },
      });

      const result = validateWebhookAuth(request);
      expect(result).not.toBeNull();
      expect(result!.status).toBe(401);

      const body = await result!.json();
      expect(body.error).toBe('Unauthorized');
      expect(body.message).toContain('Invalid');
    });
  });

  describe('withWebhookAuth', () => {
    it('should call handler when auth succeeds', async () => {
      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const wrappedHandler = withWebhookAuth(mockHandler);

      const request = new NextRequest('http://localhost/api/webhook/test', {
        headers: {
          'X-Webhook-Secret': 'test-webhook-secret',
        },
      });

      const response = await wrappedHandler(request);

      expect(mockHandler).toHaveBeenCalledWith(request);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });

    it('should not call handler when auth fails', async () => {
      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const wrappedHandler = withWebhookAuth(mockHandler);

      const request = new NextRequest('http://localhost/api/webhook/test', {
        headers: {
          'X-Webhook-Secret': 'wrong-secret',
        },
      });

      const response = await wrappedHandler(request);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
    });

    it('should not call handler when secret is missing', async () => {
      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const wrappedHandler = withWebhookAuth(mockHandler);

      const request = new NextRequest('http://localhost/api/webhook/test');

      const response = await wrappedHandler(request);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
    });
  });
});

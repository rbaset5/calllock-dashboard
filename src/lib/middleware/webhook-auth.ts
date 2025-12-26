import { NextRequest, NextResponse } from 'next/server';

/**
 * Webhook Authentication Middleware
 *
 * Validates that incoming webhook requests have the correct secret.
 * Used by all webhook routes that receive data from the V2 backend.
 *
 * Usage:
 * ```ts
 * import { validateWebhookAuth } from '@/lib/middleware/webhook-auth';
 *
 * export async function POST(request: NextRequest) {
 *   const authError = validateWebhookAuth(request);
 *   if (authError) return authError;
 *
 *   // Continue with request processing...
 * }
 * ```
 */

/**
 * Validates the webhook secret from the request headers.
 * Returns an error response if validation fails, null if successful.
 */
export function validateWebhookAuth(request: NextRequest): NextResponse | null {
  const webhookSecret = request.headers.get('X-Webhook-Secret');

  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Missing X-Webhook-Secret header' },
      { status: 401 }
    );
  }

  if (webhookSecret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Invalid webhook secret' },
      { status: 401 }
    );
  }

  return null;
}

/**
 * Type for webhook handler functions.
 * Used when wrapping handlers with authentication.
 */
export type WebhookHandler = (request: NextRequest) => Promise<NextResponse>;

/**
 * Higher-order function that wraps a webhook handler with authentication.
 * Use this for cleaner route code:
 *
 * ```ts
 * import { withWebhookAuth } from '@/lib/middleware/webhook-auth';
 *
 * export const POST = withWebhookAuth(async (request) => {
 *   // Your handler code here - already authenticated
 *   const body = await request.json();
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */
export function withWebhookAuth(handler: WebhookHandler): WebhookHandler {
  return async (request: NextRequest) => {
    const authError = validateWebhookAuth(request);
    if (authError) return authError;

    return handler(request);
  };
}

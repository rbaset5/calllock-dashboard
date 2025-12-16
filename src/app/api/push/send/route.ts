import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import webpush from 'web-push';

// Configure web-push with VAPID keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@calllock.ai';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  priority?: 'urgent' | 'standard' | 'low';
  requireInteraction?: boolean;
}

/**
 * POST /api/push/send
 *
 * Send a push notification to a user (internal API, requires webhook secret)
 *
 * This endpoint is called by the backend (V2) when sending notifications
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret
    const authHeader = request.headers.get('authorization');
    const expectedSecret = `Bearer ${process.env.WEBHOOK_SECRET}`;

    if (authHeader !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      console.error('VAPID keys not configured');
      return NextResponse.json({ error: 'Push notifications not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { userId, payload } = body as { userId: string; payload: PushPayload };

    if (!userId || !payload) {
      return NextResponse.json({ error: 'userId and payload required' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Get all subscriptions for this user
    const { data: subscriptions, error: fetchError } = await adminClient
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (fetchError) {
      console.error('Error fetching subscriptions:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No subscriptions found for user',
        sent: 0,
      });
    }

    // Prepare notification payload
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icon-192.png',
      badge: payload.badge || '/icon-96.png',
      tag: payload.tag || `calllock-${Date.now()}`,
      data: payload.data || { url: '/action' },
      priority: payload.priority || 'standard',
      requireInteraction: payload.requireInteraction || payload.priority === 'urgent',
    });

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Send to all subscriptions
    for (const sub of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh_key,
            auth: sub.auth_key,
          },
        };

        await webpush.sendNotification(pushSubscription, notificationPayload);
        results.sent++;

        // Log successful send
        await adminClient.from('notification_history').insert({
          user_id: userId,
          subscription_id: sub.id,
          title: payload.title,
          body: payload.body,
          data: payload.data,
          priority: payload.priority || 'standard',
          status: 'sent',
        });

        // Update last used timestamp
        await adminClient
          .from('push_subscriptions')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', sub.id);
      } catch (error: any) {
        results.failed++;
        results.errors.push(error.message || 'Unknown error');

        // Handle expired subscriptions
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log('Removing expired subscription:', sub.endpoint);
          await adminClient.from('push_subscriptions').delete().eq('id', sub.id);
        } else {
          // Log failed send
          await adminClient.from('notification_history').insert({
            user_id: userId,
            subscription_id: sub.id,
            title: payload.title,
            body: payload.body,
            data: payload.data,
            priority: payload.priority || 'standard',
            status: 'failed',
            error_message: error.message,
          });
        }
      }
    }

    return NextResponse.json({
      success: results.sent > 0,
      sent: results.sent,
      failed: results.failed,
      errors: results.errors.length > 0 ? results.errors : undefined,
    });
  } catch (error) {
    console.error('Push send error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

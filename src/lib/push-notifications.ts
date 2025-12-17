/**
 * Push Notifications Library
 *
 * Handles Web Push API integration for CallSeal:
 * - Service worker registration
 * - Push subscription management
 * - Permission handling
 * - Notification display
 */

// VAPID public key - must be generated and stored in environment
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

export type NotificationPermission = 'granted' | 'denied' | 'default';

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  expirationTime: number | null;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: Array<{ action: string; title: string; icon?: string }>;
  requireInteraction?: boolean;
  priority?: 'urgent' | 'standard' | 'low';
}

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Get current notification permission status
 */
export function getPermissionStatus(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'default';
  }
  return Notification.permission as NotificationPermission;
}

/**
 * Request notification permission
 */
export async function requestPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    console.warn('Push notifications not supported');
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission as NotificationPermission;
  } catch (error) {
    console.error('Failed to request notification permission:', error);
    return 'denied';
  }
}

/**
 * Register the service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('Service worker registered:', registration.scope);

    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;

    return registration;
  } catch (error) {
    console.error('Service worker registration failed:', error);
    return null;
  }
}

/**
 * Get existing push subscription
 */
export async function getSubscription(): Promise<PushSubscription | null> {
  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (error) {
    console.error('Failed to get subscription:', error);
    return null;
  }
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(): Promise<PushSubscriptionData | null> {
  if (!isPushSupported()) {
    console.warn('Push notifications not supported');
    return null;
  }

  if (!VAPID_PUBLIC_KEY) {
    console.error('VAPID public key not configured');
    return null;
  }

  try {
    // Request permission if not granted
    const permission = await requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied');
      return null;
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();

    // Create new subscription if none exists
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    // Convert to serializable format
    const subscriptionData = subscriptionToData(subscription);

    console.log('Push subscription created');
    return subscriptionData;
  } catch (error) {
    console.error('Failed to subscribe to push:', error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const subscription = await getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      console.log('Unsubscribed from push notifications');
      return true;
    }

    return false;
  } catch (error) {
    console.error('Failed to unsubscribe:', error);
    return false;
  }
}

/**
 * Save subscription to server
 */
export async function saveSubscriptionToServer(
  subscription: PushSubscriptionData
): Promise<boolean> {
  try {
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription }),
    });

    if (!response.ok) {
      throw new Error('Failed to save subscription');
    }

    return true;
  } catch (error) {
    console.error('Failed to save subscription to server:', error);
    return false;
  }
}

/**
 * Remove subscription from server
 */
export async function removeSubscriptionFromServer(
  endpoint: string
): Promise<boolean> {
  try {
    const response = await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    });

    if (!response.ok) {
      throw new Error('Failed to remove subscription');
    }

    return true;
  } catch (error) {
    console.error('Failed to remove subscription from server:', error);
    return false;
  }
}

/**
 * Show a local notification (not via push)
 */
export async function showLocalNotification(
  payload: PushNotificationPayload
): Promise<void> {
  if (!isPushSupported()) {
    console.warn('Notifications not supported');
    return;
  }

  const permission = getPermissionStatus();
  if (permission !== 'granted') {
    console.warn('Notification permission not granted');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    await registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon || '/icon-192.png',
      badge: payload.badge || '/icon-96.png',
      tag: payload.tag || 'calllock-notification',
      data: payload.data,
      requireInteraction: payload.requireInteraction || payload.priority === 'urgent',
      // actions is part of Web Notifications API but not fully typed
      ...(payload.actions ? { actions: payload.actions } : {}),
    } as NotificationOptions);
  } catch (error) {
    console.error('Failed to show notification:', error);
  }
}

/**
 * Convert VAPID key from base64 to Uint8Array
 * Returns ArrayBuffer for compatibility with PushManager.subscribe
 */
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  // Return as ArrayBuffer for PushManager.subscribe compatibility
  return outputArray.buffer.slice(0);
}

/**
 * Convert PushSubscription to serializable data
 */
function subscriptionToData(subscription: PushSubscription): PushSubscriptionData {
  const json = subscription.toJSON();

  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: json.keys?.p256dh || '',
      auth: json.keys?.auth || '',
    },
    expirationTime: subscription.expirationTime,
  };
}

/**
 * Check if service worker needs update
 */
export async function checkForUpdate(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
    return true;
  } catch (error) {
    console.error('Failed to check for service worker update:', error);
    return false;
  }
}

/**
 * Skip waiting and activate new service worker
 */
export async function activateNewWorker(): Promise<void> {
  const registration = await navigator.serviceWorker.ready;

  if (registration.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
}

/**
 * Initialize push notifications
 * Call this on app startup
 */
export async function initializePushNotifications(): Promise<{
  supported: boolean;
  permission: NotificationPermission;
  subscribed: boolean;
}> {
  const result = {
    supported: isPushSupported(),
    permission: getPermissionStatus(),
    subscribed: false,
  };

  if (!result.supported) {
    return result;
  }

  // Register service worker
  await registerServiceWorker();

  // Check existing subscription
  const subscription = await getSubscription();
  result.subscribed = subscription !== null;

  return result;
}

/**
 * Full subscription flow
 * Request permission, subscribe, and save to server
 */
export async function enablePushNotifications(): Promise<boolean> {
  try {
    // Subscribe to push
    const subscription = await subscribeToPush();

    if (!subscription) {
      return false;
    }

    // Save to server
    const saved = await saveSubscriptionToServer(subscription);

    return saved;
  } catch (error) {
    console.error('Failed to enable push notifications:', error);
    return false;
  }
}

/**
 * Full unsubscription flow
 * Unsubscribe and remove from server
 */
export async function disablePushNotifications(): Promise<boolean> {
  try {
    // Get current subscription
    const subscription = await getSubscription();

    if (subscription) {
      // Remove from server first
      await removeSubscriptionFromServer(subscription.endpoint);

      // Then unsubscribe locally
      await unsubscribeFromPush();
    }

    return true;
  } catch (error) {
    console.error('Failed to disable push notifications:', error);
    return false;
  }
}

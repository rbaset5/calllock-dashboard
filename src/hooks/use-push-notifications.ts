'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  isPushSupported,
  getPermissionStatus,
  initializePushNotifications,
  enablePushNotifications,
  disablePushNotifications,
  type NotificationPermission,
} from '@/lib/push-notifications';

interface UsePushNotificationsResult {
  supported: boolean;
  permission: NotificationPermission;
  subscribed: boolean;
  loading: boolean;
  error: string | null;
  enable: () => Promise<boolean>;
  disable: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing push notification state and subscriptions
 */
export function usePushNotifications(): UsePushNotificationsResult {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize on mount
  useEffect(() => {
    async function init() {
      try {
        const result = await initializePushNotifications();
        setSupported(result.supported);
        setPermission(result.permission);
        setSubscribed(result.subscribed);
      } catch (err) {
        console.error('Failed to initialize push notifications:', err);
        setError('Failed to initialize push notifications');
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  // Enable push notifications
  const enable = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const success = await enablePushNotifications();

      if (success) {
        setSubscribed(true);
        setPermission('granted');
      } else {
        setPermission(getPermissionStatus());
        if (getPermissionStatus() === 'denied') {
          setError('Notification permission was denied. Please enable in browser settings.');
        }
      }

      return success;
    } catch (err) {
      console.error('Failed to enable push notifications:', err);
      setError('Failed to enable push notifications');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Disable push notifications
  const disable = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const success = await disablePushNotifications();

      if (success) {
        setSubscribed(false);
      }

      return success;
    } catch (err) {
      console.error('Failed to disable push notifications:', err);
      setError('Failed to disable push notifications');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh state
  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const result = await initializePushNotifications();
      setSupported(result.supported);
      setPermission(result.permission);
      setSubscribed(result.subscribed);
      setError(null);
    } catch (err) {
      console.error('Failed to refresh push state:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    supported,
    permission,
    subscribed,
    loading,
    error,
    enable,
    disable,
    refresh,
  };
}

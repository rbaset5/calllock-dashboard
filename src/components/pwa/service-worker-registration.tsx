'use client';

import { useEffect } from 'react';

/**
 * Service Worker Registration Component
 *
 * Registers the service worker on mount for PWA functionality.
 * Should be included in the root layout.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Only register in production or if explicitly enabled
    if (process.env.NODE_ENV !== 'production' && !process.env.NEXT_PUBLIC_ENABLE_SW) {
      console.log('[SW] Skipping service worker registration in development');
      return;
    }

    if (!('serviceWorker' in navigator)) {
      console.log('[SW] Service workers not supported');
      return;
    }

    async function registerSW() {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        console.log('[SW] Service worker registered:', registration.scope);

        // Check for updates periodically (every 5 minutes)
        setInterval(() => {
          registration.update().catch(console.error);
        }, 5 * 60 * 1000);

        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;

          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              console.log('[SW] New version available');

              // Optional: Show update notification to user
              // For now, just log it. Could dispatch a custom event here.
              window.dispatchEvent(new CustomEvent('sw-update-available'));
            }
          });
        });
      } catch (error) {
        console.error('[SW] Registration failed:', error);
      }
    }

    // Register after page load to not block initial render
    if (document.readyState === 'complete') {
      registerSW();
    } else {
      window.addEventListener('load', registerSW);
    }

    // Cleanup
    return () => {
      window.removeEventListener('load', registerSW);
    };
  }, []);

  // This component doesn't render anything
  return null;
}

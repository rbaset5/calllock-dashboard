'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check localStorage for auth token
    const tokenData = localStorage.getItem('supabase.auth.token');

    if (!tokenData) {
      console.log('[AuthGuard] No token found, redirecting to login');
      router.replace('/login');
      return;
    }

    try {
      const parsed = JSON.parse(tokenData);

      // Check if token exists and hasn't expired
      if (parsed.access_token) {
        // Check expiration if available
        if (parsed.expires_at && Date.now() / 1000 > parsed.expires_at) {
          console.log('[AuthGuard] Token expired, redirecting to login');
          localStorage.removeItem('supabase.auth.token');
          router.replace('/login');
          return;
        }

        console.log('[AuthGuard] Valid token found');
        setIsAuthenticated(true);
      } else {
        console.log('[AuthGuard] Invalid token data, redirecting to login');
        router.replace('/login');
      }
    } catch (e) {
      console.error('[AuthGuard] Error parsing token:', e);
      localStorage.removeItem('supabase.auth.token');
      router.replace('/login');
    }
  }, [router]);

  // Show loading state while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

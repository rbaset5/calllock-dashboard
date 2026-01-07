'use client';

import { AuthGuard } from '@/components/auth/auth-guard';
import { Header } from '@/components/layout/header';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [urgentCount, setUrgentCount] = useState(0);

  const getActiveTab = (): 'now' | 'schedule' => {
    if (pathname?.startsWith('/schedule') || pathname?.startsWith('/booked')) return 'schedule';
    return 'now';
  };

  useEffect(() => {
    const fetchUrgentCount = async () => {
      try {
        const response = await fetch('/api/velocity');
        if (response.ok) {
          const data = await response.json();
          setUrgentCount(data.counts?.urgent || 0);
        }
      } catch (error) {
        console.error('Error fetching urgent count:', error);
      }
    };

    fetchUrgentCount();
    const interval = setInterval(fetchUrgentCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background-light">
        <Header activeTab={getActiveTab()} urgentCount={urgentCount} />
        <main className="pb-8">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}

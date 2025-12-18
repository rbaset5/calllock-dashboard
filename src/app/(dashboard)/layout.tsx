'use client';

import { AuthGuard } from '@/components/auth/auth-guard';
import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Sidebar } from '@/components/layout/sidebar';
import { DemoBanner } from '@/components/ui/demo-banner';
import { useEffect, useState } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [businessName, setBusinessName] = useState<string | undefined>(undefined);

  useEffect(() => {
    // Get business name from localStorage token
    const tokenData = localStorage.getItem('supabase.auth.token');
    if (tokenData) {
      try {
        const parsed = JSON.parse(tokenData);
        // The user metadata should have business_name from signup
        const name = parsed.user?.user_metadata?.business_name;
        if (name) {
          setBusinessName(name);
        }
      } catch (e) {
        console.error('[DashboardLayout] Error getting business name:', e);
      }
    }
  }, []);

  return (
    <AuthGuard>
      {/* Demo mode banner */}
      <DemoBanner />

      <div className="min-h-screen bg-[#F9FAFB]">
        {/* Desktop sidebar */}
        <Sidebar businessName={businessName} />

        {/* Main content area - offset for sidebar on desktop */}
        <div className="lg:pl-60">
          {/* Header - hidden on desktop since sidebar has branding */}
          <div className="lg:hidden sticky top-0 z-40">
            <Header businessName={businessName} />
          </div>

          {/* Main content with max-width on desktop */}
          <main className="pb-20 lg:pb-8">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>

          {/* Mobile bottom navigation */}
          <MobileNav />
        </div>
      </div>
    </AuthGuard>
  );
}

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { AlertCircle, Calendar, Clock, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

// V4 Primary navigation - ACTION/BOOKED model
const navItems = [
  { href: '/action', label: 'Action', icon: AlertCircle, hasBadge: true },
  { href: '/booked', label: 'Booked', icon: Calendar },
  { href: '/history', label: 'History', icon: Clock },
];

// Secondary navigation - Settings only per V4 PRD
const secondaryNavItems = [
  { href: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  businessName?: string;
}

/** Get initials from business name for avatar */
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function Sidebar({ businessName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [actionCount, setActionCount] = useState(0);

  // Fetch action count for badge (V4)
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const response = await fetch('/api/action');
        if (response.ok) {
          const data = await response.json();
          setActionCount(data.counts?.total || 0);
        }
      } catch (error) {
        console.error('Error fetching action count:', error);
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-60 lg:border-r lg:border-navy-200 lg:bg-white">
      {/* Logo/Brand */}
      <div className="h-16 flex items-center px-6 border-b border-navy-200">
        <span className="text-xl font-bold text-navy-700">CallLock</span>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            const showBadge = item.hasBadge && actionCount > 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'bg-navy-100 text-navy-900 font-semibold'
                    : 'text-navy-500 hover:bg-navy-50 hover:text-navy-700 font-medium'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="flex-1">{item.label}</span>
                {showBadge && (
                  <span className="min-w-[20px] h-5 flex items-center justify-center px-1.5 text-xs font-bold text-white bg-gold-500 rounded-full">
                    {actionCount > 99 ? '99+' : actionCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Secondary Navigation */}
        <div className="mt-8 pt-4 border-t border-navy-200 space-y-1">
          {secondaryNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'bg-navy-100 text-navy-900 font-semibold'
                    : 'text-navy-500 hover:bg-navy-50 hover:text-navy-700 font-medium'
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Profile Section */}
      <div className="p-4 border-t border-navy-200">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-navy-100 flex items-center justify-center text-sm font-semibold text-navy-600">
            {businessName ? getInitials(businessName) : 'U'}
          </div>

          {/* Name & Sign Out */}
          <div className="flex-1 min-w-0">
            {businessName && (
              <p className="text-sm font-medium text-navy-800 truncate">
                {businessName}
              </p>
            )}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-xs text-navy-400 hover:text-navy-600 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { AlertCircle, Calendar, Clock, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

// V4 Navigation - ACTION/BOOKED model
const navItems = [
  { href: '/action', label: 'Action', icon: AlertCircle, hasBadge: true },
  { href: '/booked', label: 'Booked', icon: Calendar },
  { href: '/history', label: 'History', icon: Clock },
  { href: '/more', label: 'More', icon: MoreHorizontal },
];

export function MobileNav() {
  const pathname = usePathname();
  const [actionCount, setActionCount] = useState(0);

  // Fetch action count for badge (leads needing attention)
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const response = await fetch('/api/action');
        if (response.ok) {
          const data = await response.json();
          // Use total count from action API
          setActionCount(data.counts?.total || 0);
        }
      } catch (error) {
        console.error('Error fetching action count:', error);
      }
    };

    fetchCount();
    // Refresh count every 60 seconds
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-navy-200 z-50 safe-area-bottom lg:hidden">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          const showBadge = item.hasBadge && actionCount > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex flex-col items-center justify-center py-2 px-4 min-w-[64px] min-h-[56px] transition-colors',
                isActive
                  ? 'text-navy-600'
                  : 'text-navy-400 hover:text-navy-600'
              )}
            >
              <div className="relative">
                <Icon className="w-6 h-6" />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-gold-500 rounded-full">
                    {actionCount > 99 ? '99+' : actionCount}
                  </span>
                )}
              </div>
              <span className="text-xs mt-1 font-medium">{item.label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-navy-600 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

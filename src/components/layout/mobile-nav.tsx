'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Sun, Inbox, Calendar, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/today', label: 'Today', icon: Sun },
  { href: '/action-items', label: 'Action Items', icon: Inbox, hasBadge: true },
  { href: '/schedule', label: 'Schedule', icon: Calendar },
  { href: '/customers', label: 'Customers', icon: Users },
];

export function MobileNav() {
  const pathname = usePathname();
  const [actionItemsCount, setActionItemsCount] = useState(0);

  // Fetch action items count for badge
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const response = await fetch('/api/leads');
        if (response.ok) {
          const data = await response.json();
          setActionItemsCount(data.counts?.total || 0);
        }
      } catch (error) {
        console.error('Error fetching action items count:', error);
      }
    };

    fetchCount();
    // Refresh count every 60 seconds
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom lg:hidden">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          const showBadge = item.hasBadge && actionItemsCount > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex flex-col items-center justify-center py-2 px-4 min-w-[64px] min-h-[56px] transition-colors',
                isActive
                  ? 'text-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <div className="relative">
                <Icon className="w-6 h-6" />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
                    {actionItemsCount > 99 ? '99+' : actionItemsCount}
                  </span>
                )}
              </div>
              <span className="text-xs mt-1">{item.label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-primary-600 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

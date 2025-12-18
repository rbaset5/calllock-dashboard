'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface PageTabsProps {
  activeTab: 'action' | 'booked';
  actionCount?: number;
  bookedCount?: number;
}

export function PageTabs({ activeTab, actionCount = 0, bookedCount = 0 }: PageTabsProps) {
  return (
    <div className="flex items-center border-b border-border mb-4 gap-8">
      <Link
        href="/action"
        className={cn(
          'shrink-0 cursor-pointer whitespace-nowrap inline-flex justify-center items-center gap-2 font-medium transition-colors',
          'text-sm py-2.5 border-b-2 -mb-px',
          activeTab === 'action'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-primary'
        )}
      >
        Action
        {actionCount > 0 && (
          <Badge
            variant="warning"
            className={cn(
              'min-w-[20px] h-5 px-1.5 text-xs font-bold',
              activeTab !== 'action' && 'opacity-60'
            )}
          >
            {actionCount > 99 ? '99+' : actionCount}
          </Badge>
        )}
      </Link>
      <Link
        href="/booked"
        className={cn(
          'shrink-0 cursor-pointer whitespace-nowrap inline-flex justify-center items-center gap-2 font-medium transition-colors',
          'text-sm py-2.5 border-b-2 -mb-px',
          activeTab === 'booked'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-primary'
        )}
      >
        Booked
        {bookedCount > 0 && (
          <Badge
            variant="default"
            className={cn(
              'min-w-[20px] h-5 px-1.5 text-xs font-bold',
              activeTab !== 'booked' && 'opacity-60'
            )}
          >
            {bookedCount > 99 ? '99+' : bookedCount}
          </Badge>
        )}
      </Link>
    </div>
  );
}

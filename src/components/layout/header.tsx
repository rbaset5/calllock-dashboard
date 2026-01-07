'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

interface HeaderProps {
  activeTab?: 'now' | 'schedule';
  urgentCount?: number;
}

const tabs = [
  { id: 'now', label: 'Now', href: '/now' },
  { id: 'schedule', label: 'Schedule', href: '/schedule' },
] as const;

export function Header({ activeTab = 'now', urgentCount = 0 }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-background-light/95 backdrop-blur-md border-b border-slate-200">
      <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-[20px]">lock_open</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">CallLock</h1>
        </div>

        <div className="flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse"></div>
          <span className="text-primary font-bold text-xs uppercase tracking-wide">Online</span>
        </div>
      </div>

      <div className="flex items-end px-4 max-w-lg mx-auto w-full">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const showBadge = tab.id === 'now' && urgentCount > 0;

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                'flex-1 pb-3 pt-2 text-center border-b-[3px] transition-colors',
                isActive
                  ? 'border-primary text-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              )}
            >
              <span className="text-sm font-bold tracking-wide">{tab.label}</span>
              {showBadge && (
                <span className="ml-1.5 inline-flex items-center justify-center bg-red-500 text-white text-[10px] font-bold h-5 min-w-5 px-1 rounded-full">
                  {urgentCount > 9 ? '9+' : urgentCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </header>
  );
}

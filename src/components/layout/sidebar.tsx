'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Sun, Inbox, Calendar, Users, BarChart3, Settings, LogOut, BookOpen, Bell, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

const navItems = [
  { href: '/today', label: 'Today', icon: Sun },
  { href: '/action-items', label: 'Action Items', icon: Inbox },
  { href: '/alerts', label: 'Alerts', icon: Bell },
  { href: '/schedule', label: 'Schedule', icon: Calendar },
  { href: '/customers', label: 'Customers', icon: Users },
];

const secondaryNavItems = [
  { href: '/calls', label: 'Calls', icon: Phone },
  { href: '/knowledgebase', label: 'Knowledgebase', icon: BookOpen },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
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

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-60 lg:border-r lg:border-gray-200 lg:bg-white">
      {/* Logo/Brand */}
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <span className="text-xl font-bold text-primary-600">CallLock</span>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'bg-gray-100 text-gray-900 font-semibold'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 font-medium'
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Secondary Navigation */}
        <div className="mt-8 pt-4 border-t border-gray-200 space-y-1">
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
                    ? 'bg-gray-100 text-gray-900 font-semibold'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 font-medium'
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
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-600">
            {businessName ? getInitials(businessName) : 'U'}
          </div>

          {/* Name & Sign Out */}
          <div className="flex-1 min-w-0">
            {businessName && (
              <p className="text-sm font-medium text-gray-900 truncate">
                {businessName}
              </p>
            )}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
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

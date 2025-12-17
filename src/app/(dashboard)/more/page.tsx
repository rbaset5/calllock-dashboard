'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users, Phone, BarChart3, BookOpen, Settings, Bell, LogOut, ChevronRight, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface MenuSection {
  title: string;
  items: {
    href: string;
    label: string;
    icon: React.ElementType;
    description?: string;
  }[];
}

const menuSections: MenuSection[] = [
  {
    title: 'Quick Access',
    items: [
      { href: '/customers', label: 'Customers', icon: Users, description: 'Customer directory' },
      { href: '/calls', label: 'Call History', icon: Phone, description: 'View all calls' },
      { href: '/reports', label: 'Reports', icon: BarChart3, description: 'Business analytics' },
      { href: '/knowledgebase', label: 'Knowledge Base', icon: BookOpen, description: 'Help articles' },
    ],
  },
  {
    title: 'Account',
    items: [
      { href: '/settings', label: 'Profile & Settings', icon: Settings, description: 'Manage your account' },
      { href: '/settings#notifications', label: 'Notifications', icon: Bell, description: 'Alert preferences' },
    ],
  },
];

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function MorePage() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          setEmail(user.email || '');
          // Try to get business name from user metadata
          const metadata = user.user_metadata || {};
          setBusinessName(metadata.business_name || metadata.full_name || '');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-2xl mx-auto pb-24">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">More</h1>
        <p className="text-sm text-gray-500">Settings & additional features</p>
      </div>

      {/* Menu Sections */}
      {menuSections.map((section) => (
        <div key={section.title}>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
            {section.title}
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                >
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{item.label}</p>
                    {item.description && (
                      <p className="text-sm text-gray-500">{item.description}</p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      {/* Account Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            {loading ? (
              <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
            ) : businessName ? (
              <span className="text-sm font-semibold text-gray-600">
                {getInitials(businessName)}
              </span>
            ) : (
              <User className="w-6 h-6 text-gray-400" />
            )}
          </div>

          {/* Name & Email */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <>
                <div className="h-5 bg-gray-200 rounded w-32 mb-1 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-48 animate-pulse" />
              </>
            ) : (
              <>
                {businessName && (
                  <p className="font-medium text-gray-900 truncate">{businessName}</p>
                )}
                <p className="text-sm text-gray-500 truncate">{email}</p>
              </>
            )}
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={handleSignOut}
          className="mt-4 w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors min-h-[48px]"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      {/* App Version */}
      <p className="text-center text-xs text-gray-400">
        CallSeal Dashboard v1.0
      </p>
    </div>
  );
}

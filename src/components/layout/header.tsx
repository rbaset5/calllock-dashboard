'use client';

import { useRouter } from 'next/navigation';
import { LogOut, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Logo } from '@/components/brand';

interface HeaderProps {
  businessName?: string;
}

export function Header({ businessName }: HeaderProps) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="px-4 py-3 flex items-center justify-center relative">
        <div className="flex items-center gap-3">
          <Logo size="lg" />
          {businessName && (
            <span className="text-sm text-gray-500 hidden sm:inline">
              {businessName}
            </span>
          )}
        </div>

        <div className="absolute right-4 flex items-center gap-2">
          <button
            onClick={() => router.push('/settings')}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
            aria-label="Settings"
          >
            <User className="w-5 h-5" />
          </button>
          <button
            onClick={handleSignOut}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
            aria-label="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@/types/database';
import type { User as AuthUser } from '@supabase/supabase-js';

interface UseUserReturn {
  user: AuthUser | null;
  profile: User | null;
  loading: boolean;
  error: Error | null;
}

export function useUser(): UseUserReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function getUser() {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

        if (authError) throw authError;
        setUser(authUser);

        if (authUser) {
          const { data: profileData, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single();

          if (profileError) throw profileError;
          setProfile(profileData);
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);

        if (session?.user) {
          const { data: profileData } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          setProfile(profileData);
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  return { user, profile, loading, error };
}

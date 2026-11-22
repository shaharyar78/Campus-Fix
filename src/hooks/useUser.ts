'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { UserProfile } from '@/types';
import { createClient } from '@/lib/supabase/client';

export function useUser() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error: profileError } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (profileError) {
      setError(profileError.message);
      setProfile(null);
      return;
    }
    setError(null);
    setProfile(data as UserProfile);
  }, [supabase]);

  useEffect(() => {
    let active = true;
    const applySession = async (sessionUser: User | null) => {
      if (!active) return;
      setUser(sessionUser);
      if (sessionUser) {
        await fetchProfile(sessionUser.id);
      } else {
        setProfile(null);
        setError(null);
      }
      if (active) setIsLoading(false);
    };

    const refreshSession = () => {
      void supabase.auth
        .getSession()
        .then(({ data }) => applySession(data.session?.user ?? null))
        .catch(() => {
          if (active) {
            setError('Unable to check your sign-in session.');
            setIsLoading(false);
          }
        });
    };

    refreshSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session?.user ?? null);
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('cf-auth-changed', refreshSession);
    }

    return () => {
      active = false;
      subscription.unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('cf-auth-changed', refreshSession);
      }
    };
  }, [fetchProfile, supabase]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    router.push('/login');
    router.refresh();
  };

  return { user, profile, role: profile?.role || 'student', collegeId: profile?.college_id, isLoading, error, signOut };
}

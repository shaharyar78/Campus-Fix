'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const supabase = createClient();

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error: profileError } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (profileError) { setError(profileError.message); setProfile(null); return; }
    setProfile(data as UserProfile);
  }, [supabase]);

  useEffect(() => {
    let active = true;
    const applySession = async (sessionUser: User | null) => {
      if (!active) return;
      setUser(sessionUser);
      if (sessionUser) await fetchProfile(sessionUser.id);
      else setProfile(null);
      if (active) setIsLoading(false);
    };
    void supabase.auth.getSession().then(({ data }) => applySession(data.session?.user ?? null)).catch(() => {
      if (active) { setError('Unable to check your sign-in session.'); setIsLoading(false); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { void applySession(session?.user ?? null); });
    return () => { active = false; subscription.unsubscribe(); };
  }, [fetchProfile, supabase]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    router.push('/login');
  };

  return { user, profile, role: profile?.role || 'student', collegeId: profile?.college_id, isLoading, error, signOut };
}

import { NextResponse } from 'next/server';
import { createClient } from './supabase/server';
import { isSupabaseConfigured } from './supabase/config';
import { isTrustedSameOriginRequest } from './supabase/mockCookies';
import { UserProfile } from '@/types';

export interface AuthContext {
  user: {
    id: string;
    email?: string;
  } | null;
  profile: UserProfile | null;
}

export function apiError(
  code: string,
  message: string,
  status: number,
  extra?: Record<string, unknown>
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...extra,
      },
    },
    { status }
  );
}

export async function getAuthContext(request?: Request): Promise<AuthContext> {
  if (request && !isSupabaseConfigured() && !isTrustedSameOriginRequest(request)) {
    return { user: null, profile: null };
  }
  try {
    const supabase = await createClient(request);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (!userError && user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile?.approval_status === 'approved') {
        return {
          user,
          profile: profile as UserProfile,
        };
      }
    }
  } catch {
    // Authentication failures fail closed.
  }

  return { user: null, profile: null };
}

export function validateCollegeAccess(
  profile: UserProfile,
  targetCollegeId: string | null | undefined
): boolean {
  if (!targetCollegeId) return true;
  if (profile.role === 'super_admin') return true;
  return profile.college_id === targetCollegeId;
}

import { NextResponse } from 'next/server';
import { createClient } from './supabase/server';
import { isSupabaseConfigured } from './supabase/config';
import { isTrustedSameOriginRequest } from './supabase/mockCookies';
import { isRecord } from './validators';
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

export function requireSameOrigin(request: Request): NextResponse | null {
  if (!isTrustedSameOriginRequest(request)) {
    return apiError('FORBIDDEN', 'Invalid request origin.', 403);
  }
  return null;
}

export async function requireJsonBody(
  request: Request
): Promise<{ data: Record<string, unknown> | null; errorResponse: NextResponse | null }> {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return {
      data: null,
      errorResponse: apiError('UNSUPPORTED_MEDIA_TYPE', 'Content-Type must be application/json', 415),
    };
  }

  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return {
      data: null,
      errorResponse: apiError('BAD_REQUEST', 'Invalid JSON body', 400),
    };
  }

  if (!isRecord(parsed)) {
    return {
      data: null,
      errorResponse: apiError('BAD_REQUEST', 'Invalid JSON body', 400),
    };
  }

  return { data: parsed, errorResponse: null };
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

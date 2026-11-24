import { createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from './config';
import { MOCK_SESSION_COOKIE, verifyMockSessionToken } from './mockCookies';
import { getMockStore } from './mockStore';

function isProtectedPath(pathname: string): boolean {
  if (
    pathname === '/dashboard' ||
    pathname.startsWith('/dashboard/') ||
    pathname === '/report' ||
    pathname.startsWith('/report/') ||
    pathname === '/chat' ||
    pathname.startsWith('/chat/') ||
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname === '/super-admin' ||
    pathname.startsWith('/super-admin/')
  ) {
    return true;
  }

  // /track landing search is public; /track/[id] detail pages are protected.
  if (pathname.startsWith('/track/') && pathname !== '/track/') {
    return true;
  }

  return false;
}

function redirectWithCookies(
  request: NextRequest,
  targetPath: string,
  sourceResponse: NextResponse
): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = targetPath;
  url.search = '';
  const redirectResponse = NextResponse.redirect(url);
  for (const cookie of sourceResponse.cookies.getAll()) {
    redirectResponse.cookies.set(cookie);
  }
  return redirectResponse;
}

function enforceRoleRedirect(
  request: NextRequest,
  pathname: string,
  profile: { role?: string | null; approval_status?: string | null } | null,
  sourceResponse: NextResponse
): NextResponse | null {
  if (!profile || profile.approval_status === 'pending') {
    return redirectWithCookies(request, '/account/pending', sourceResponse);
  }
  if (profile.approval_status === 'rejected') {
    return redirectWithCookies(request, '/account/rejected', sourceResponse);
  }
  if (profile.approval_status !== 'approved') {
    return redirectWithCookies(request, '/account/pending', sourceResponse);
  }

  const role = profile.role || 'student';

  if (pathname === '/super-admin' || pathname.startsWith('/super-admin/')) {
    if (role !== 'super_admin') {
      return redirectWithCookies(
        request,
        role === 'admin' ? '/admin' : '/dashboard',
        sourceResponse
      );
    }
  }

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (role !== 'admin' && role !== 'super_admin') {
      return redirectWithCookies(request, '/dashboard', sourceResponse);
    }
  }

  return null;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const pathname = request.nextUrl.pathname;
  const requiresAuth = isProtectedPath(pathname);

  if (!isSupabaseConfigured()) {
    if (!requiresAuth) {
      return supabaseResponse;
    }

    const token = request.cookies.get(MOCK_SESSION_COOKIE)?.value;
    const mockUserId = verifyMockSessionToken(token);
    if (!mockUserId) {
      return redirectWithCookies(request, '/login', supabaseResponse);
    }

    const store = getMockStore();
    const mockProfile = store.profiles.find((p) => p.id === mockUserId) || null;
    const roleRedirect = enforceRoleRedirect(request, pathname, mockProfile, supabaseResponse);
    return roleRedirect || supabaseResponse;
  }

  const isHttps =
    request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase() === 'https' ||
    request.nextUrl.protocol === 'https:';
  const allowIframeEmbed = process.env.ALLOW_IFRAME_EMBED === 'true';

  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, {
            ...options,
            ...(allowIframeEmbed && isHttps
              ? { sameSite: 'none' as const, secure: true }
              : { sameSite: 'lax' as const, ...(isHttps ? { secure: true } : {}) }),
          })
        );
      },
    },
  });

  // refreshing the auth token
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!requiresAuth) {
    return supabaseResponse;
  }

  if (!user) {
    return redirectWithCookies(request, '/login', supabaseResponse);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, approval_status')
    .eq('id', user.id)
    .maybeSingle();

  const roleRedirect = enforceRoleRedirect(request, pathname, profile, supabaseResponse);
  return roleRedirect || supabaseResponse;
}

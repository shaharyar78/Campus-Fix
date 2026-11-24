import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomUUID } from 'node:crypto';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { requireJsonBody, requireSameOrigin } from '@/lib/serverAuth';
import {
  clearMockSessionCookie,
  extractMockBearerToken,
  setMockSessionCookie,
  signMockSessionToken,
  verifyMockSessionToken,
} from '@/lib/supabase/mockCookies';
import {
  authenticateMockUser,
  executeMockQuery,
  getMockAuthUser,
  getMockStore,
  hashMockPassword,
  MOCK_SESSION_COOKIE,
  mockResetPasswordForEmail,
  mockUpdateUser,
  type MockQueryPayload,
} from '@/lib/supabase/mockStore';

async function getCurrentSessionUser(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(MOCK_SESSION_COOKIE)?.value || extractMockBearerToken(request);
  const userId = verifyMockSessionToken(token);
  if (!userId) return null;
  return getMockAuthUser(userId);
}

export async function POST(request: Request) {
  try {
    if (process.env.NODE_ENV === 'production' || isSupabaseConfigured()) {
      return NextResponse.json({ error: { message: 'Not available' } }, { status: 404 });
    }

    const originError = requireSameOrigin(request);
    if (originError) return originError;

    const { data: parsedBody, errorResponse } = await requireJsonBody(request);
    if (errorResponse || !parsedBody) return errorResponse!;

    const body = parsedBody as {
      kind?: string;
      payload?: MockQueryPayload;
      action?: string;
      params?: Record<string, unknown>;
    };

    if (body.kind === 'query' && body.payload) {
      const result = executeMockQuery(body.payload);
      return NextResponse.json(result);
    }

    if (body.kind === 'auth') {
      const store = getMockStore();
      const action = body.action;
      const params = body.params || {};

      if (action === 'getUser') {
        const user = await getCurrentSessionUser(request);
        return NextResponse.json({ data: { user }, error: null });
      }

      if (action === 'getSession') {
        const user = await getCurrentSessionUser(request);
        const cookieStore = await cookies();
        const rawToken = cookieStore.get(MOCK_SESSION_COOKIE)?.value || extractMockBearerToken(request);
        const accessToken = user ? (rawToken || signMockSessionToken(user.id)) : '';
        const session = user ? { access_token: accessToken, user } : null;
        return NextResponse.json({ data: { session }, error: null });
      }

      if (action === 'signInWithPassword') {
        const email = typeof params.email === 'string' ? params.email : '';
        const password = typeof params.password === 'string' ? params.password : '';
        const { user, error } = authenticateMockUser(email, password);
        if (error || !user) {
          return NextResponse.json({
            data: { user: null, session: null },
            error: { message: 'Invalid login credentials' },
          });
        }
        const token = signMockSessionToken(user.id);
        const session = { access_token: token, user };
        const response = NextResponse.json({ data: { user, session }, error: null });
        setMockSessionCookie(response, token, request);
        return response;
      }

      if (action === 'signUp') {
        const email = typeof params.email === 'string' ? params.email.trim().toLowerCase() : '';
        const password = typeof params.password === 'string' ? params.password : '';
        const options = (params.options || {}) as { data?: Record<string, unknown> };
        const meta = options.data || {};

        if (!email || !password) {
          return NextResponse.json({
            data: { user: null, session: null },
            error: { message: 'Email and password are required' },
          });
        }
        if (store.users.some((u) => u.email.toLowerCase() === email)) {
          return NextResponse.json({
            data: { user: null, session: null },
            error: { message: 'User already registered' },
          });
        }

        const collegeId = typeof meta.college_id === 'string' ? meta.college_id : null;
        const college = store.colleges.find((c) => c.id === collegeId && c.is_active);
        if (!college) {
          return NextResponse.json({
            data: { user: null, session: null },
            error: { message: 'Select an active college before signing up' },
          });
        }

        if (college.email_domain) {
          const domain = email.split('@')[1] || '';
          const allowed = college.email_domain
            .split(',')
            .map((d) => d.trim().replace(/^@/, '').toLowerCase())
            .filter(Boolean);
          if (allowed.length > 0 && !allowed.includes(domain)) {
            return NextResponse.json({
              data: { user: null, session: null },
              error: { message: 'Use an email address from your selected college domain' },
            });
          }
        }

        const id = randomUUID();
        const requestedRole = meta.role === 'admin' ? 'admin' : 'student';
        const isStudent = requestedRole === 'student';
        const approvalStatus = isStudent ? 'approved' : 'pending';
        const fullName =
          typeof meta.full_name === 'string' && meta.full_name.trim()
            ? meta.full_name.trim()
            : email.split('@')[0];
        const now = new Date().toISOString();

        store.users.push({ id, email, passwordHash: hashMockPassword(password), user_metadata: meta });
        store.profiles.push({
          id,
          college_id: college.id,
          role: 'student',
          full_name: fullName,
          username: null,
          email,
          avatar_url: null,
          approval_status: approvalStatus,
          approval_requested_role: requestedRole,
          approved_by: null,
          approved_at: isStudent ? now : null,
          created_at: now,
          updated_at: now,
        });

        const user = { id, email, user_metadata: meta };
        const token = signMockSessionToken(id);
        const session = { access_token: token, user };
        const response = NextResponse.json({ data: { user, session }, error: null });
        setMockSessionCookie(response, token, request);
        return response;
      }

      if (action === 'signOut') {
        const response = NextResponse.json({ error: null });
        clearMockSessionCookie(response, request);
        return response;
      }

      if (action === 'updateUser') {
        const user = await getCurrentSessionUser(request);
        const password = typeof params.password === 'string' ? params.password : '';
        const result = mockUpdateUser(user?.id, { password });
        return NextResponse.json(result, { status: result.error?.status || 200 });
      }

      if (action === 'resetPasswordForEmail') {
        const email = typeof params.email === 'string' ? params.email : '';
        const result = mockResetPasswordForEmail(email);
        return NextResponse.json(result, { status: result.error?.status || 200 });
      }
    }

    return NextResponse.json({ data: null, error: { message: 'Unsupported mock operation' } }, { status: 400 });
  } catch (err) {
    console.error('Mock supabase route error:', err);
    return NextResponse.json({ data: null, error: { message: 'Mock store request failed' } }, { status: 500 });
  }
}

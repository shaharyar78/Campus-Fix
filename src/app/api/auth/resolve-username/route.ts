import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { requireJsonBody, requireSameOrigin } from '@/lib/serverAuth';
import { checkRateLimit, getClientIp, rateLimitErrorResponse } from '@/lib/rateLimit';
import { setMockSessionCookie, signMockSessionToken } from '@/lib/supabase/mockCookies';
import { authenticateMockUser, hashMockPassword, verifyMockPassword } from '@/lib/supabase/mockStore';

const GENERIC_LOGIN_ERROR = 'Username or password is incorrect.';
const DUMMY_PASSWORD_HASH = hashMockPassword('campusfix-timing-equalization-placeholder');

export async function POST(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const { data: body, errorResponse } = await requireJsonBody(request);
  if (errorResponse || !body) {
    return errorResponse!;
  }

  const rawIdentifier = typeof body.username === 'string' ? body.username.trim() : '';
  const rawPassword = typeof body.password === 'string' ? body.password : '';

  if (!rawIdentifier || !rawPassword || rawIdentifier.length < 2 || rawIdentifier.length > 120) {
    return NextResponse.json({ error: 'Enter a valid username or email.' }, { status: 400 });
  }

  const clientIp = getClientIp(request);
  const normalizedIdentifier = rawIdentifier.toLowerCase();

  const rateLimit = await checkRateLimit({
    key: `login:${clientIp}:${normalizedIdentifier}`,
    limit: 5,
    windowSeconds: 60,
  });
  if (!rateLimit.allowed) {
    return rateLimitErrorResponse(rateLimit.retryAfter, 'simple');
  }

  try {
    const serviceClient = createServiceClient();
    let email: string | null = null;

    if (normalizedIdentifier.includes('@')) {
      email = normalizedIdentifier;
    } else {
      const { data, error } = await serviceClient
        .from('profiles')
        .select('email')
        .eq('username', normalizedIdentifier)
        .maybeSingle();

      if (error) {
        console.error('Username lookup error:', error);
      } else if (data?.email) {
        email = data.email;
      }
    }

    if (!isSupabaseConfigured()) {
      if (!email) {
        verifyMockPassword(rawPassword, DUMMY_PASSWORD_HASH);
        return NextResponse.json({ error: GENERIC_LOGIN_ERROR }, { status: 401 });
      }

      const { user, error: authError } = authenticateMockUser(email, rawPassword);
      if (authError || !user) {
        return NextResponse.json({ error: GENERIC_LOGIN_ERROR }, { status: 401 });
      }

      const token = signMockSessionToken(user.id);
      const session = { access_token: token, user };
      const response = NextResponse.json({ success: true, user, session });
      setMockSessionCookie(response, token, request);
      return response;
    }

    const authClient = await createClient(request);

    // Perform password check even when username does not map to a profile
    // so response timing and error message remain uniform.
    const lookupEmail = email || `nonexistent-${normalizedIdentifier}@invalid.campusfix.local`;
    const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
      email: lookupEmail,
      password: rawPassword,
    });

    if (!email || authError || !authData.user) {
      return NextResponse.json({ error: GENERIC_LOGIN_ERROR }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      session: authData.session
        ? {
            access_token: authData.session.access_token,
            refresh_token: authData.session.refresh_token,
          }
        : null,
    });
  } catch (err) {
    console.error('Sign-in service error:', err);
    return NextResponse.json({ error: 'Sign-in is not available right now.' }, { status: 503 });
  }
}

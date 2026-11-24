import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getMockStore, hashMockPassword } from '@/lib/supabase/mockStore';
import { requireJsonBody, requireSameOrigin } from '@/lib/serverAuth';
import { checkRateLimit, getClientIp, rateLimitErrorResponse } from '@/lib/rateLimit';
import { verifyTurnstileToken } from '@/lib/turnstile';
import { validatePassword } from '@/lib/validators';

const CONFIRMATION_MESSAGE = 'Check your email to confirm your account.';

function getRequestOrigin(request: Request): string {
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  const host = request.headers.get('host')?.split(',')[0]?.trim();
  if (host) {
    const protocol = forwardedProto || (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');
    return `${protocol}://${host}`;
  }
  return new URL(request.url).origin;
}

export async function POST(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const { data: body, errorResponse } = await requireJsonBody(request);
  if (errorResponse || !body) {
    return errorResponse!;
  }

  const clientIp = getClientIp(request);
  const rateLimit = await checkRateLimit({
    key: `register:${clientIp}`,
    limit: 5,
    windowSeconds: 3600,
  });
  if (!rateLimit.allowed) {
    return rateLimitErrorResponse(rateLimit.retryAfter, 'simple');
  }

  const captchaToken = typeof body.captchaToken === 'string' ? body.captchaToken : null;
  const turnstileResult = await verifyTurnstileToken(captchaToken, clientIp);
  if (!turnstileResult.success) {
    return NextResponse.json(
      { error: turnstileResult.error || 'Security check failed. Please retry.' },
      { status: 400 }
    );
  }

  try {
    const email = typeof body.email === 'string' ? body.email : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const fullName = typeof body.full_name === 'string' ? body.full_name : '';
    const collegeId = typeof body.college_id === 'string' ? body.college_id.trim() : '';
    const requestedRole = body.role === 'admin' ? 'admin' : 'student';

    if (!email.trim() || !password || !collegeId) {
      return NextResponse.json({ error: 'Missing required registration details.' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const safeFullName = fullName.trim() || normalizedEmail.split('@')[0];

    if (isSupabaseConfigured()) {
      const serviceClient = createServiceClient();
      const { data: college, error: collegeError } = await serviceClient
        .from('colleges')
        .select('id, name, email_domain, is_active')
        .eq('id', collegeId)
        .eq('is_active', true)
        .maybeSingle();

      if (collegeError) {
        console.error('Register college lookup error:', collegeError);
        return NextResponse.json({ error: 'Registration is temporarily unavailable.' }, { status: 500 });
      }
      if (!college) {
        return NextResponse.json({ error: 'Select an active college before signing up.' }, { status: 400 });
      }

      if (college.email_domain) {
        const emailDomain = normalizedEmail.split('@')[1] || '';
        const allowed = college.email_domain
          .split(',')
          .map((d: string) => d.trim().replace(/^@/, '').toLowerCase())
          .filter(Boolean);
        if (allowed.length > 0 && !allowed.includes(emailDomain)) {
          return NextResponse.json(
            { error: 'Use an email address from your selected college domain.' },
            { status: 400 }
          );
        }
      }

      const authClient = await createClient(request);
      const emailRedirectTo = `${getRequestOrigin(request)}/auth/callback`;

      const { error: signUpError } = await authClient.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo,
          ...(captchaToken ? { captchaToken } : {}),
          data: {
            full_name: safeFullName,
            role: requestedRole,
            college_id: college.id,
          },
        },
      });

      if (signUpError) {
        const errMsg = signUpError.message?.toLowerCase() || '';
        const errStatus = (signUpError as { status?: number }).status;
        const errCode = (signUpError as { code?: string }).code;

        if (
          errStatus === 422 ||
          errCode === 'email_exists' ||
          errCode === 'user_already_exists' ||
          errMsg.includes('already') ||
          errMsg.includes('registered')
        ) {
          // Return identical confirmation response to prevent email enumeration.
          return NextResponse.json({
            success: true,
            requiresEmailConfirmation: true,
            message: CONFIRMATION_MESSAGE,
          });
        }

        if (errStatus === 429 || errMsg.includes('rate limit')) {
          return rateLimitErrorResponse(60, 'simple');
        }

        console.error('Supabase signUp error:', signUpError);
        return NextResponse.json(
          { error: 'Could not complete registration. Please check your details and try again.' },
          { status: 400 }
        );
      }

      // Profile creation, college/domain enforcement, and initial approval_status
      // are handled strictly by the handle_new_user database trigger.
      return NextResponse.json({
        success: true,
        requiresEmailConfirmation: true,
        message: CONFIRMATION_MESSAGE,
      });
    }

    // Development mock preview mode
    const store = getMockStore();
    const college = store.colleges.find((c) => c.id === collegeId && c.is_active);
    if (!college) {
      return NextResponse.json({ error: 'Select an active college before signing up.' }, { status: 400 });
    }
    if (college.email_domain) {
      const emailDomain = normalizedEmail.split('@')[1] || '';
      const allowed = college.email_domain
        .split(',')
        .map((d) => d.trim().replace(/^@/, '').toLowerCase())
        .filter(Boolean);
      if (allowed.length > 0 && !allowed.includes(emailDomain)) {
        return NextResponse.json(
          { error: 'Use an email address from your selected college domain.' },
          { status: 400 }
        );
      }
    }

    if (store.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      return NextResponse.json({
        success: true,
        requiresEmailConfirmation: true,
        message: CONFIRMATION_MESSAGE,
      });
    }

    const id = randomUUID();
    const now = new Date().toISOString();
    const isStudent = requestedRole === 'student';

    store.users.push({
      id,
      email: normalizedEmail,
      passwordHash: hashMockPassword(password),
      email_confirmed: false,
      user_metadata: { full_name: safeFullName, role: requestedRole, college_id: college.id },
    });

    store.profiles.push({
      id,
      college_id: college.id,
      role: 'student',
      full_name: safeFullName,
      username: null,
      email: normalizedEmail,
      avatar_url: null,
      approval_status: isStudent ? 'approved' : 'pending',
      approval_requested_role: requestedRole,
      approved_by: null,
      approved_at: isStudent ? now : null,
      created_at: now,
      updated_at: now,
    });

    return NextResponse.json({
      success: true,
      requiresEmailConfirmation: true,
      message: CONFIRMATION_MESSAGE,
    });
  } catch (err) {
    console.error('Register unexpected error:', err);
    return NextResponse.json(
      { error: 'Could not complete registration. Please try again.' },
      { status: 500 }
    );
  }
}

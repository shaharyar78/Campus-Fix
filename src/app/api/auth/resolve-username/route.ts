import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import {
  isTrustedSameOriginRequest,
  setMockSessionCookie,
  signMockSessionToken,
} from '@/lib/supabase/mockCookies';
import { authenticateMockUser } from '@/lib/supabase/mockStore';

export async function POST(request: Request) {
  if (!isTrustedSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== 'object' ||
    !('username' in body) ||
    typeof body.username !== 'string' ||
    !('password' in body) ||
    typeof body.password !== 'string' ||
    !body.password
  ) {
    return NextResponse.json({ error: 'Enter a valid username or email.' }, { status: 400 });
  }

  const identifier = body.username.trim();
  if (identifier.length < 2 || identifier.length > 120) {
    return NextResponse.json({ error: 'Enter a valid username or email.' }, { status: 400 });
  }

  try {
    const supabase = createServiceClient();
    let email: string | null = null;

    if (identifier.includes('@')) {
      email = identifier;
    } else {
      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .ilike('username', identifier)
        .maybeSingle();

      if (error || !data?.email) {
        return NextResponse.json({ error: 'Username or password is incorrect.' }, { status: 401 });
      }
      email = data.email;
    }

    if (!email) {
      return NextResponse.json({ error: 'Username or password is incorrect.' }, { status: 401 });
    }

    if (!isSupabaseConfigured()) {
      const { user, error: authError } = authenticateMockUser(email, body.password);
      if (authError || !user) {
        return NextResponse.json({ error: 'Username or password is incorrect.' }, { status: 401 });
      }

      const token = signMockSessionToken(user.id);
      const session = { access_token: token, user };
      const response = NextResponse.json({ success: true, user, session });
      setMockSessionCookie(response, token, request);
      return response;
    }

    const authClient = await createClient(request);
    let { data: authData, error: authError } = await authClient.auth.signInWithPassword({
      email,
      password: body.password,
    });

    if (authError && authError.message.toLowerCase().includes('email not confirmed')) {
      const { data: usersData } = await supabase.auth.admin.listUsers();
      const matched = usersData?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (matched) {
        await supabase.auth.admin.updateUserById(matched.id, { email_confirm: true });
        const retry = await authClient.auth.signInWithPassword({
          email,
          password: body.password,
        });
        authData = retry.data;
        authError = retry.error;
      }
    }

    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Username or password is incorrect.' }, { status: 401 });
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
  } catch {
    return NextResponse.json({ error: 'Sign-in is not available right now.' }, { status: 503 });
  }
}

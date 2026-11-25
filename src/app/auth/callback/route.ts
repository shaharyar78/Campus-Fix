import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  try {
    const code = searchParams.get('code');
    const supabase = await createClient();

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        return NextResponse.redirect(new URL('/forgot-password?error=link_expired', origin));
      }
    }

    if (code && searchParams.get('next') === '/auth/update-password') {
      return NextResponse.redirect(new URL('/auth/update-password', origin));
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL('/login', origin));
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, approval_status')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || profile.approval_status === 'pending') {
      return NextResponse.redirect(new URL('/account/pending', origin));
    }

    if (profile.approval_status === 'rejected') {
      return NextResponse.redirect(new URL('/account/rejected', origin));
    }

    const dashboard =
      profile.role === 'super_admin'
        ? '/super-admin'
        : profile.role === 'admin'
          ? '/admin'
          : '/dashboard';

    return NextResponse.redirect(new URL(dashboard, origin));
  } catch (err) {
    console.error('Auth callback unexpected error:', err);
    return NextResponse.redirect(new URL('/login?error=auth_callback_failed', origin));
  }
}

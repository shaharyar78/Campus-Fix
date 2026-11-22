import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
  if (
    !body ||
    typeof body !== 'object' ||
    !('username' in body) ||
    typeof body.username !== 'string' ||
    !('password' in body) ||
    typeof body.password !== 'string' ||
    !body.password
  ) {
    return NextResponse.json({ error: 'Enter a valid username.' }, { status: 400 });
  }
  const username = body.username.trim();
  if (!/^[a-zA-Z0-9_]{3,32}$/.test(username)) return NextResponse.json({ error: 'Enter a valid username.' }, { status: 400 });
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.from('profiles').select('email').ilike('username', username).eq('role', 'super_admin').maybeSingle();
    if (error || !data?.email) return NextResponse.json({ error: 'Username or password is incorrect.' }, { status: 401 });

    const authClient = await createClient();
    const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
      email: data.email,
      password: body.password,
    });
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Username or password is incorrect.' }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Username sign-in is not available right now.' }, { status: 503 });
  }
}

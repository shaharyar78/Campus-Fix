import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createServiceClient } from '@/lib/supabase/server';
import { getMockStore, hashMockPassword } from '@/lib/supabase/mockStore';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and new password are required.' }, { status: 400 });
    }
    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    if (isSupabaseConfigured()) {
      const serviceClient = createServiceClient();
      const { data: usersData, error: listError } = await serviceClient.auth.admin.listUsers();
      if (listError) {
        return NextResponse.json({ error: listError.message || 'Could not query account service.' }, { status: 500 });
      }

      const user = usersData.users.find((u) => u.email?.toLowerCase() === normalizedEmail);
      if (!user) {
        return NextResponse.json({ error: 'No account found with this email address.' }, { status: 404 });
      }

      const { error: updateError } = await serviceClient.auth.admin.updateUserById(user.id, {
        password: String(password),
        email_confirm: true,
      });

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: 'Password updated successfully! You can now sign in with your new password.',
      });
    } else {
      const store = getMockStore();
      const user = store.users.find((u) => u.email.toLowerCase() === normalizedEmail);
      if (!user) {
        return NextResponse.json({ error: 'No account found with this email address.' }, { status: 404 });
      }
      user.passwordHash = hashMockPassword(String(password));
      return NextResponse.json({
        success: true,
        message: 'Password updated successfully! You can now sign in with your new password.',
      });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update password.' },
      { status: 500 }
    );
  }
}

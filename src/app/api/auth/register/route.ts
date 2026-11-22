import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createServiceClient } from '@/lib/supabase/server';
import { getMockStore, hashMockPassword } from '@/lib/supabase/mockStore';
import { randomUUID } from 'node:crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, full_name, college_id, role } = body;

    if (!email || !password || !college_id) {
      return NextResponse.json({ error: 'Missing required registration details.' }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const targetRole = role === 'admin' ? 'admin' : 'student';
    const isStudent = targetRole === 'student';
    // Students are approved automatically! Admins require super-admin approval.
    const approvalStatus = isStudent ? 'approved' : 'pending';

    if (isSupabaseConfigured()) {
      const serviceClient = createServiceClient();

      // Check if user already exists in auth
      const { data: existingUsersData } = await serviceClient.auth.admin.listUsers();
      const existingUser = existingUsersData?.users?.find(
        (u) => u.email?.toLowerCase() === normalizedEmail
      );

      if (existingUser) {
        return NextResponse.json(
          { error: 'An account with this email address is already registered. Please sign in.' },
          { status: 400 }
        );
      }

      // Create user with email_confirm: true so no SMTP error happens!
      const { data: created, error: createError } = await serviceClient.auth.admin.createUser({
        email: normalizedEmail,
        password: String(password),
        email_confirm: true,
        user_metadata: {
          full_name: full_name ? String(full_name).trim() : normalizedEmail.split('@')[0],
          role: targetRole,
          college_id: college_id,
        },
      });

      if (createError || !created.user) {
        return NextResponse.json(
          { error: createError?.message || 'Could not create account.' },
          { status: 400 }
        );
      }

      const now = new Date().toISOString();
      // Ensure profile is recorded with student approved automatically
      await serviceClient
        .from('profiles')
        .upsert({
          id: created.user.id,
          college_id: college_id,
          role: targetRole,
          approval_status: approvalStatus,
          approval_requested_role: targetRole,
          email: normalizedEmail,
          full_name: full_name ? String(full_name).trim() : normalizedEmail.split('@')[0],
          approved_at: isStudent ? now : null,
          created_at: now,
          updated_at: now,
        });

      return NextResponse.json({
        success: true,
        isStudent,
        user: { id: created.user.id, email: normalizedEmail },
        message: isStudent
          ? 'Account created successfully! You can sign in immediately.'
          : 'Administrator registration submitted. Awaiting super-admin approval.',
      });
    } else {
      // Mock preview mode
      const store = getMockStore();
      if (store.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
        return NextResponse.json(
          { error: 'An account with this email address is already registered. Please sign in.' },
          { status: 400 }
        );
      }
      const id = randomUUID();
      const now = new Date().toISOString();
      const name = full_name ? String(full_name).trim() : normalizedEmail.split('@')[0];

      store.users.push({
        id,
        email: normalizedEmail,
        passwordHash: hashMockPassword(String(password)),
        user_metadata: { full_name: name, role: targetRole, college_id },
      });

      store.profiles.push({
        id,
        college_id,
        role: targetRole,
        full_name: name,
        username: null,
        email: normalizedEmail,
        avatar_url: null,
        approval_status: approvalStatus,
        approval_requested_role: targetRole,
        approved_by: null,
        approved_at: isStudent ? now : null,
        created_at: now,
        updated_at: now,
      });

      return NextResponse.json({
        success: true,
        isStudent,
        message: isStudent
          ? 'Account created successfully! You can sign in immediately.'
          : 'Administrator registration submitted. Awaiting super-admin approval.',
      });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error occurred during registration.' },
      { status: 500 }
    );
  }
}

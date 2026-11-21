import { NextResponse } from 'next/server';
import { apiError, getAuthContext } from '@/lib/serverAuth';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const { user, profile } = await getAuthContext();
  if (!user || !profile) {
    return apiError('UNAUTHORIZED', 'Authentication required', 401);
  }

  if (profile.role !== 'admin' && profile.role !== 'super_admin') {
    return apiError('FORBIDDEN', 'Approval access is restricted', 403);
  }

  const supabase = await createClient();
  let query = supabase
    .from('profiles')
    .select('id, college_id, college:colleges(name), role, full_name, email, approval_status, approval_requested_role, approved_by, approved_at, created_at')
    .eq('approval_status', 'pending');

  if (profile.role === 'admin') {
    query = query
      .eq('college_id', profile.college_id)
      .eq('approval_requested_role', 'student');
  } else {
    query = query.eq('approval_requested_role', 'admin');
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) {
    return apiError('DATABASE_ERROR', 'Could not load pending accounts', 500);
  }

  return NextResponse.json({ data: data || [] });
}

export async function PATCH(request: Request) {
  const { user, profile } = await getAuthContext(request);
  if (!user || !profile) {
    return apiError('UNAUTHORIZED', 'Authentication required', 401);
  }

  if (profile.role !== 'admin' && profile.role !== 'super_admin') {
    return apiError('FORBIDDEN', 'Approval access is restricted', 403);
  }

  let body: { profile_id?: string; action?: 'approve' | 'reject' };
  try {
    body = await request.json();
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body', 400);
  }

  if (!body.profile_id || !body.action || !['approve', 'reject'].includes(body.action)) {
    return apiError('VALIDATION_ERROR', 'profile_id and a valid action are required', 400);
  }

  const supabase = await createClient();
  const { data: target, error: targetError } = await supabase
    .from('profiles')
    .select('id, college_id, role, approval_status, approval_requested_role')
    .eq('id', body.profile_id)
    .single();

  if (targetError || !target) {
    return apiError('NOT_FOUND', 'Account not found', 404);
  }

  if (target.approval_status !== 'pending') {
    return apiError('CONFLICT', 'Account has already been processed', 409);
  }

  if (profile.role === 'admin') {
    if (
      target.approval_requested_role !== 'student' ||
      target.college_id !== profile.college_id
    ) {
      return apiError('FORBIDDEN', 'Admins can only approve students in their college', 403);
    }
  } else if (target.approval_requested_role !== 'admin') {
    return apiError('FORBIDDEN', 'Super-admins can only approve administrator requests', 403);
  }

  if (body.action === 'approve') {
    const approvedRole =
      profile.role === 'super_admin' && target.approval_requested_role === 'admin'
        ? 'admin'
        : 'student';

    const { data, error } = await supabase
      .from('profiles')
      .update({
        role: approvedRole,
        approval_status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', target.id)
      .select()
      .single();

    if (error) {
      return apiError('FORBIDDEN', 'Account approval was denied', 403);
    }

    return NextResponse.json({ data });
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({
      approval_status: 'rejected',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq('id', target.id)
    .select()
    .single();

  if (error) {
    return apiError('FORBIDDEN', 'Account rejection was denied', 403);
  }

  return NextResponse.json({ data });
}

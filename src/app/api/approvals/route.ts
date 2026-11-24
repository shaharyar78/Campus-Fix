import { NextResponse } from 'next/server';
import { apiError, getAuthContext, requireJsonBody, requireSameOrigin } from '@/lib/serverAuth';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { user, profile } = await getAuthContext(request);
    if (!user || !profile) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401);
    }

    if (profile.role !== 'admin' && profile.role !== 'super_admin') {
      return apiError('FORBIDDEN', 'Approval access is restricted', 403);
    }

    const supabase = await createClient(request);
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
      console.error('Approvals GET error:', error);
      return apiError('DATABASE_ERROR', 'Could not load pending accounts', 500);
    }

    return NextResponse.json({ data: data || [] });
  } catch (err) {
    console.error('Approvals GET unexpected error:', err);
    return apiError('INTERNAL_ERROR', 'Could not load pending accounts', 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const originError = requireSameOrigin(request);
    if (originError) return originError;

    const { user, profile } = await getAuthContext(request);
    if (!user || !profile) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401);
    }

    if (profile.role !== 'admin' && profile.role !== 'super_admin') {
      return apiError('FORBIDDEN', 'Approval access is restricted', 403);
    }

    const { data: body, errorResponse } = await requireJsonBody(request);
    if (errorResponse || !body) return errorResponse!;

    const profileId = typeof body.profile_id === 'string' ? body.profile_id.trim() : '';
    const action = typeof body.action === 'string' ? body.action : '';

    if (!profileId || (action !== 'approve' && action !== 'reject')) {
      return apiError('VALIDATION_ERROR', 'profile_id and a valid action are required', 400);
    }

    const serviceClient = createServiceClient();
    const { data: target, error: targetError } = await serviceClient
      .from('profiles')
      .select('id, college_id, role, approval_status, approval_requested_role')
      .eq('id', profileId)
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

    if (action === 'approve') {
      const approvedRole =
        profile.role === 'super_admin' && target.approval_requested_role === 'admin'
          ? 'admin'
          : 'student';

      const { data, error } = await serviceClient
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
        console.error('Approval update error:', error);
        return apiError('FORBIDDEN', 'Account approval was denied', 403);
      }

      return NextResponse.json({ data });
    }

    const { data, error } = await serviceClient
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
      console.error('Rejection update error:', error);
      return apiError('FORBIDDEN', 'Account rejection was denied', 403);
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('Approvals PATCH unexpected error:', err);
    return apiError('INTERNAL_ERROR', 'Could not update the approval request', 500);
  }
}

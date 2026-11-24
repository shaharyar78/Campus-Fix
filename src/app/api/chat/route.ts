import { NextResponse } from 'next/server';
import { getAuthContext, apiError, requireJsonBody, requireSameOrigin } from '@/lib/serverAuth';
import { checkRateLimit, rateLimitErrorResponse } from '@/lib/rateLimit';
import { createClient } from '@/lib/supabase/server';

function parsePagination(params: URLSearchParams) {
  const rawLimit = Number(params.get('limit'));
  const rawOffset = Number(params.get('offset'));
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 50) : 20;
  const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? Math.floor(rawOffset) : 0;
  return { limit, offset };
}

export async function GET(request: Request) {
  try {
    const { user, profile } = await getAuthContext(request);
    if (!user || !profile) return apiError('UNAUTHORIZED', 'Authentication required to view messages', 401);

    const params = new URL(request.url).searchParams;
    const { limit, offset } = parsePagination(params);
    const reportId = params.get('report_id');
    const supabase = await createClient(request);
    const requestedCollegeId = params.get('college_id');
    const collegeId = profile.role === 'super_admin' ? requestedCollegeId : profile.college_id;
    if (!collegeId) return apiError('COLLEGE_REQUIRED', 'Select a campus to open its chat', 400);

    if (profile.role === 'super_admin') {
      const { data: college } = await supabase.from('colleges').select('id').eq('id', collegeId).eq('is_active', true).maybeSingle();
      if (!college) return apiError('COLLEGE_NOT_FOUND', 'The selected campus is not active', 404);
    }

    let query = supabase
      .from('messages')
      .select('*, sender:profiles!sender_id(id, full_name, email, role)', { count: 'exact' })
      .eq('college_id', collegeId)
      .order('created_at', { ascending: false });
    query = reportId ? query.eq('report_id', reportId) : query.is('report_id', null);

    const { data, count, error } = await query.range(offset, offset + limit - 1);
    if (error) {
      console.error('Chat list error:', error);
      return apiError('DATABASE_ERROR', 'Could not load messages from the database', 500);
    }

    const rows = (data || []).slice().reverse();
    const total = typeof count === 'number' ? count : rows.length;
    return NextResponse.json({
      data: rows,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + rows.length < total,
      },
    });
  } catch (err) {
    console.error('Chat GET unexpected error:', err);
    return apiError('INTERNAL_ERROR', 'Could not load messages from the database', 500);
  }
}

export async function POST(request: Request) {
  try {
    const originError = requireSameOrigin(request);
    if (originError) return originError;

    const { user, profile } = await getAuthContext(request);
    if (!user || !profile) return apiError('UNAUTHORIZED', 'Authentication required to send messages', 401);

    const rateLimit = await checkRateLimit({
      key: `chat:send:${user.id}`,
      limit: 30,
      windowSeconds: 60,
    });
    if (!rateLimit.allowed) {
      return rateLimitErrorResponse(rateLimit.retryAfter);
    }

    const { data: body, errorResponse } = await requireJsonBody(request);
    if (errorResponse || !body) return errorResponse!;

    if (typeof body.body !== 'string' || !body.body.trim()) {
      return apiError('VALIDATION_ERROR', 'Message body cannot be empty', 400);
    }
    const messageBody = body.body;
    if (messageBody.length > 4000) return apiError('VALIDATION_ERROR', 'Message body cannot exceed 4000 characters', 400);

    const supabase = await createClient(request);
    const collegeId = profile.role === 'super_admin' && typeof body.college_id === 'string'
      ? body.college_id
      : profile.college_id;
    if (!collegeId) return apiError('COLLEGE_REQUIRED', 'Select a campus to send a message', 400);
    if (profile.role === 'super_admin') {
      const { data: college } = await supabase.from('colleges').select('id').eq('id', collegeId).eq('is_active', true).maybeSingle();
      if (!college) return apiError('COLLEGE_NOT_FOUND', 'The selected campus is not active', 404);
    }
    const reportId = typeof body.report_id === 'string' ? body.report_id : null;
    if (reportId) {
      const { data: report } = await supabase.from('reports').select('id').eq('id', reportId).eq('college_id', collegeId).maybeSingle();
      if (!report) return apiError('NOT_FOUND', 'Report not found in the selected campus', 404);
    }
    const { data, error } = await supabase.from('messages').insert([{
      college_id: collegeId,
      report_id: reportId,
      sender_id: user.id,
      body: messageBody.trim(),
    }]).select('*, sender:profiles!sender_id(id, full_name, email, role)').single();
    if (error) {
      console.error('Chat insert error:', error);
      return apiError('DATABASE_ERROR', 'Could not save the message', 500);
    }
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error('Chat POST unexpected error:', err);
    return apiError('INTERNAL_ERROR', 'Could not save the message', 500);
  }
}

import { NextResponse } from 'next/server';
import { getAuthContext, apiError, requireJsonBody, requireSameOrigin } from '@/lib/serverAuth';
import { createClient } from '@/lib/supabase/server';
import { ReportStatus } from '@/types';

const validStatuses: ReportStatus[] = ['submitted', 'under_review', 'assigned', 'in_progress', 'resolved', 'rejected', 'closed'];

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const originError = requireSameOrigin(request);
    if (originError) return originError;

    const { user, profile } = await getAuthContext(request);
    if (!user || !profile) return apiError('UNAUTHORIZED', 'Authentication required', 401);
    if (profile.role !== 'admin' && profile.role !== 'super_admin') return apiError('FORBIDDEN', 'Administrator permission required', 403);

    const { data: body, errorResponse } = await requireJsonBody(request);
    if (errorResponse || !body) return errorResponse!;

    if (typeof body.message !== 'string' || !body.message.trim()) {
      return apiError('VALIDATION_ERROR', 'Update message is required', 400);
    }
    const message = body.message;
    if (body.status !== undefined && (typeof body.status !== 'string' || !validStatuses.includes(body.status as ReportStatus))) {
      return apiError('VALIDATION_ERROR', 'Invalid report status', 400);
    }

    const { id } = await params;
    const supabase = await createClient(request);
    if (profile.role === 'admin' && !profile.college_id) return apiError('COLLEGE_REQUIRED', 'Your account is not assigned to a college', 400);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let reportQuery = supabase.from('reports').select('id, college_id').limit(1);
    if (profile.role !== 'super_admin' && profile.college_id) reportQuery = reportQuery.eq('college_id', profile.college_id);
    reportQuery = isUuid ? reportQuery.eq('id', id) : reportQuery.eq('tracking_id', id);
    const { data: report, error: reportError } = await reportQuery.maybeSingle();
    if (reportError) {
      console.error('Report updates lookup error:', reportError);
      return apiError('DATABASE_ERROR', 'Could not load the report', 500);
    }
    if (!report) return apiError('NOT_FOUND', 'Report not found', 404);

    const { data, error } = await supabase.rpc('append_report_update', {
      p_report_id: report.id,
      p_status: typeof body.status === 'string' ? body.status as ReportStatus : null,
      p_message: message.trim(),
    });
    if (error) {
      console.error('Report updates insert error:', error);
      return apiError('DATABASE_ERROR', 'Could not save the report update', 500);
    }
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error('Report updates unexpected error:', err);
    return apiError('INTERNAL_ERROR', 'Could not process the report update', 500);
  }
}

import { NextResponse } from 'next/server';
import { getAuthContext, apiError, requireJsonBody, requireSameOrigin } from '@/lib/serverAuth';
import { signReportPhotoPaths } from '@/lib/reportPhotos';
import { createClient } from '@/lib/supabase/server';
import { ReportStatus } from '@/types';

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const validStatuses: ReportStatus[] = ['submitted', 'under_review', 'assigned', 'in_progress', 'resolved', 'rejected', 'closed'];

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, profile } = await getAuthContext(request);
    if (!user || !profile) return apiError('UNAUTHORIZED', 'Authentication required', 401);
    const { id } = await params;
    const supabase = await createClient(request);
    let query = supabase.from('reports').select('*, building:buildings(id, name, code), submitter:profiles!submitter_id(id, full_name, email)').limit(1);
    query = isUuid(id) ? query.eq('id', id) : query.eq('tracking_id', id);
    if (profile.college_id) query = query.eq('college_id', profile.college_id);
    else if (profile.role !== 'super_admin') return apiError('COLLEGE_REQUIRED', 'Your account is not assigned to a college', 400);
    const { data, error } = await query.maybeSingle();
    if (error) {
      console.error('Report detail query error:', error);
      return apiError('DATABASE_ERROR', 'Could not load the report', 500);
    }
    if (!data) return apiError('NOT_FOUND', 'Report not found', 404);

    const photo_urls = await signReportPhotoPaths(data.photo_paths, data.college_id);
    return NextResponse.json({ data: { ...data, photo_urls } });
  } catch (err) {
    console.error('Report detail GET unexpected error:', err);
    return apiError('INTERNAL_ERROR', 'Could not load the report', 500);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const originError = requireSameOrigin(request);
    if (originError) return originError;

    const { user, profile } = await getAuthContext(request);
    if (!user || !profile) return apiError('UNAUTHORIZED', 'Authentication required', 401);
    if (profile.role !== 'admin' && profile.role !== 'super_admin') return apiError('FORBIDDEN', 'Administrator permission required', 403);

    const { id } = await params;
    const { data: body, errorResponse } = await requireJsonBody(request);
    if (errorResponse || !body) return errorResponse!;

    if (body.status !== undefined && (typeof body.status !== 'string' || !validStatuses.includes(body.status as ReportStatus))) {
      return apiError('VALIDATION_ERROR', 'Invalid report status', 400);
    }

    const supabase = await createClient(request);
    if (profile.role === 'admin' && !profile.college_id) return apiError('COLLEGE_REQUIRED', 'Your account is not assigned to a college', 400);
    let query = supabase.from('reports').select('id, college_id').limit(1);
    if (profile.role !== 'super_admin' && profile.college_id) query = query.eq('college_id', profile.college_id);
    query = isUuid(id) ? query.eq('id', id) : query.eq('tracking_id', id);
    const { data: existing, error: findError } = await query.maybeSingle();
    if (findError) {
      console.error('Report lookup for PATCH error:', findError);
      return apiError('DATABASE_ERROR', 'Could not load the report', 500);
    }
    if (!existing) return apiError('NOT_FOUND', 'Report not found', 404);

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body.status === 'string') {
      updates.status = body.status as ReportStatus;
      if (body.status === 'resolved') {
        updates.resolved_at = updates.updated_at;
      } else if (body.status !== 'closed') {
        updates.resolved_at = null;
      }
    }
    if (body.assigned_to === null || typeof body.assigned_to === 'string') updates.assigned_to = body.assigned_to;
    if (body.building_id === null || typeof body.building_id === 'string') updates.building_id = body.building_id;
    if (body.floor === null || typeof body.floor === 'string') updates.floor = body.floor;
    if (body.room === null || typeof body.room === 'string') updates.room = body.room;
    if (body.section === null || typeof body.section === 'string') updates.section = body.section;
    if (typeof body.situation === 'string' && ['normal', 'medium', 'high', 'critical'].includes(body.situation)) updates.situation = body.situation;

    const { data, error } = await supabase.from('reports').update(updates).eq('id', existing.id).select().single();
    if (error || !data) {
      console.error('Report PATCH error:', error);
      return apiError('DATABASE_ERROR', 'Could not update the report', 500);
    }
    const photo_urls = await signReportPhotoPaths(data.photo_paths, data.college_id);
    return NextResponse.json({ data: { ...data, photo_urls } });
  } catch (err) {
    console.error('Report PATCH unexpected error:', err);
    return apiError('INTERNAL_ERROR', 'Could not update the report', 500);
  }
}

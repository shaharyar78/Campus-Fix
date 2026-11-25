import { NextResponse } from 'next/server';
import { getAuthContext, apiError, requireJsonBody, requireSameOrigin } from '@/lib/serverAuth';
import { signReportPhotoPaths } from '@/lib/reportPhotos';
import { createClient } from '@/lib/supabase/server';

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

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

    if (body.status !== undefined) {
      return apiError('VALIDATION_ERROR', 'Use the report update endpoint to change status', 400);
    }

    const supabase = await createClient(request);
    if (profile.role === 'admin' && !profile.college_id) return apiError('COLLEGE_REQUIRED', 'Your account is not assigned to a college', 400);
    let query = supabase.from('reports').select('id, college_id, building_id, section').limit(1);
    if (profile.role !== 'super_admin' && profile.college_id) query = query.eq('college_id', profile.college_id);
    query = isUuid(id) ? query.eq('id', id) : query.eq('tracking_id', id);
    const { data: existing, error: findError } = await query.maybeSingle();
    if (findError) {
      console.error('Report lookup for PATCH error:', findError);
      return apiError('DATABASE_ERROR', 'Could not load the report', 500);
    }
    if (!existing) return apiError('NOT_FOUND', 'Report not found', 404);

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.assigned_to === null) {
      updates.assigned_to = null;
    } else if (typeof body.assigned_to === 'string') {
      const { data: assignee, error: assigneeError } = await supabase
        .from('profiles')
        .select('id, college_id, role, approval_status')
        .eq('id', body.assigned_to)
        .eq('college_id', existing.college_id)
        .maybeSingle();
      if (assigneeError) return apiError('DATABASE_ERROR', 'Could not verify the assigned administrator', 500);
      if (!assignee || assignee.role !== 'admin' || assignee.approval_status !== 'approved') {
        return apiError('VALIDATION_ERROR', 'Choose an approved administrator from this campus', 400);
      }
      updates.assigned_to = assignee.id;
    }

    if (body.building_id === null) {
      updates.building_id = null;
      if (body.section === undefined) updates.section = null;
    } else if (typeof body.building_id === 'string') {
      const buildingId = body.building_id.trim();
      if (!buildingId) return apiError('VALIDATION_ERROR', 'Select a valid building', 400);
      const { data: building, error: buildingError } = await supabase
        .from('buildings')
        .select('id, sections')
        .eq('id', buildingId)
        .eq('college_id', existing.college_id)
        .eq('is_active', true)
        .maybeSingle();
      if (buildingError) return apiError('DATABASE_ERROR', 'Could not verify the selected building', 500);
      if (!building) return apiError('VALIDATION_ERROR', 'Choose an active building from this campus', 400);
      updates.building_id = building.id;
      const sections = Array.isArray(building.sections) ? building.sections as string[] : [];
      const nextSection = typeof body.section === 'string' ? body.section.trim().toUpperCase() : '';
      if (sections.length > 0 && !nextSection && building.id !== existing.building_id) {
        return apiError('VALIDATION_ERROR', 'Select a section for this building', 400);
      }
      if (nextSection && !sections.some((section) => section.toUpperCase() === nextSection)) {
        return apiError('VALIDATION_ERROR', 'Select a valid section for this building', 400);
      }
      if (body.section !== undefined || building.id !== existing.building_id) {
        updates.section = nextSection || null;
      }
    }
    if (body.floor === null || typeof body.floor === 'string') updates.floor = body.floor;
    if (body.room === null || typeof body.room === 'string') updates.room = body.room;
    if (body.section === null) updates.section = null;
    else if (typeof body.section === 'string' && body.building_id === undefined) {
      return apiError('VALIDATION_ERROR', 'Choose a building before setting a section', 400);
    }
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

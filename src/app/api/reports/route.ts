import { NextResponse } from 'next/server';
import { getAuthContext, apiError } from '@/lib/serverAuth';
import { isRecord, validateReportInput } from '@/lib/validators';
import { generateTrackingId } from '@/lib/trackingId';
import { findPotentialDuplicates } from '@/lib/deduplication';
import { createClient } from '@/lib/supabase/server';
import { Report, ReportCategory, SituationLevel } from '@/types';

export async function GET(request: Request) {
  const { user, profile } = await getAuthContext(request);
  if (!user || !profile) return apiError('UNAUTHORIZED', 'Authentication required to view reports', 401);
  if (profile.role !== 'super_admin' && !profile.college_id) return apiError('COLLEGE_REQUIRED', 'Your account is not assigned to a college', 400);
  const params = new URL(request.url).searchParams;
  const supabase = await createClient();
  let query = supabase
    .from('reports')
    .select('*, building:buildings(id, name, code), submitter:profiles!submitter_id(id, full_name, email)')
    .order('created_at', { ascending: false });
  if (profile.college_id) query = query.eq('college_id', profile.college_id);

  const status = params.get('status');
  const category = params.get('category');
  const buildingId = params.get('building_id');
  const search = params.get('search');
  if (status && status !== 'all') query = query.eq('status', status);
  if (category && category !== 'all') query = query.eq('category', category);
  if (buildingId && buildingId !== 'all') query = query.eq('building_id', buildingId);
  if (search?.trim()) query = query.ilike('title', `%${search.trim()}%`);

  const { data, error } = await query;
  if (error) return apiError('DATABASE_ERROR', 'Could not load reports from the database', 500);
  return NextResponse.json({ data: data || [] });
}

export async function POST(request: Request) {
  const { user, profile } = await getAuthContext(request);
  if (!user || !profile) return apiError('UNAUTHORIZED', 'Authentication required to create reports', 401);
  let payload: unknown;
  try { payload = await request.json(); } catch { return apiError('BAD_REQUEST', 'Invalid JSON payload', 400); }
  if (!isRecord(payload)) return apiError('BAD_REQUEST', 'Invalid JSON payload', 400);
  const body = payload;
  const validation = validateReportInput({
    title: typeof body.title === 'string' ? body.title : undefined,
    description: typeof body.description === 'string' ? body.description : undefined,
    category: typeof body.category === 'string' ? body.category : undefined,
    building_id: typeof body.building_id === 'string' ? body.building_id : undefined,
  });
  if (!validation.isValid) return apiError('VALIDATION_ERROR', Object.values(validation.errors).join(', '), 400, { field_errors: validation.errors });
  if (typeof body.title !== 'string' || typeof body.description !== 'string' || typeof body.category !== 'string') return apiError('VALIDATION_ERROR', 'Report fields are invalid', 400);
  const category = body.category as ReportCategory;
  const title = body.title;
  const description = body.description;

  const supabase = await createClient();
  const targetCollegeId = profile.role === 'super_admin' && typeof body.college_id === 'string'
    ? body.college_id
    : profile.college_id;
  if (!targetCollegeId) return apiError('COLLEGE_REQUIRED', 'Select an active college before creating a report', 400);
  const { data: college, error: collegeError } = await supabase
    .from('colleges')
    .select('id, slug, is_active')
    .eq('id', targetCollegeId)
    .maybeSingle();
  if (collegeError) return apiError('DATABASE_ERROR', 'Could not verify the report college', 500);
  if (!college?.is_active) return apiError('COLLEGE_NOT_FOUND', 'The selected college is not active', 404);
  if (profile.role !== 'super_admin' && profile.college_id !== college.id) return apiError('FORBIDDEN', 'You cannot create reports for another college', 403);
  const { data: existingReports, error: duplicateQueryError } = await supabase
    .from('reports')
    .select('id, title, description, category, building_id, floor, room, tracking_id, college_id, submitter_id, status, upvote_count, photo_paths, created_at, updated_at')
    .eq('college_id', college.id)
    .in('status', ['submitted', 'under_review', 'assigned', 'in_progress']);
  if (duplicateQueryError) return apiError('DATABASE_ERROR', 'Could not check existing reports', 500);

  if (!body.force && !body.allow_duplicate) {
    const match = findPotentialDuplicates({
      title,
      description,
      category,
      building_id: typeof body.building_id === 'string' ? body.building_id : null,
      floor: typeof body.floor === 'string' ? body.floor : null,
      room: typeof body.room === 'string' ? body.room : null,
    }, (existingReports || []) as unknown as Report[]);
    if (match.isDuplicate && match.matches.length) {
      return apiError('DUPLICATE_REPORT', 'A similar report already exists', 409, {
        existing_report_id: match.matches[0].id,
        existing_tracking_id: match.matches[0].tracking_id,
      });
    }
  }

  const { data, error } = await supabase.from('reports').insert([{
    college_id: college.id,
    submitter_id: user.id,
    building_id: typeof body.building_id === 'string' ? body.building_id : null,
    building_label: typeof body.building_label === 'string' ? body.building_label : null,
    tracking_id: generateTrackingId(college.slug),
    title: title.trim(),
    description: description.trim(),
    category,
    floor: typeof body.floor === 'string' ? body.floor : null,
    room: typeof body.room === 'string' ? body.room : null,
    section: typeof body.section === 'string' ? body.section : null,
    situation: typeof body.situation === 'string' && ['normal', 'medium', 'high', 'critical'].includes(body.situation) ? body.situation as SituationLevel : 'normal',
    photo_paths: Array.isArray(body.photo_paths) ? body.photo_paths : [],
    status: 'submitted',
    upvote_count: 0,
  }]).select('*, building:buildings(id, name, code), submitter:profiles!submitter_id(id, full_name, email)').single();

  if (error) return apiError('DATABASE_ERROR', 'Could not save the report', 500);
  return NextResponse.json({ data }, { status: 201 });
}

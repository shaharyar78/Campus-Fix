import { NextResponse } from 'next/server';
import { getAuthContext, apiError, requireJsonBody, requireSameOrigin } from '@/lib/serverAuth';
import { checkRateLimit, rateLimitErrorResponse } from '@/lib/rateLimit';
import { isValidReportPhotoPath, MAX_UPLOAD_FILES } from '@/lib/imageSecurity';
import { signReportPhotoPaths } from '@/lib/reportPhotos';
import { validateReportInput } from '@/lib/validators';
import { generateTrackingId } from '@/lib/trackingId';
import { findPotentialDuplicates } from '@/lib/deduplication';
import { createClient } from '@/lib/supabase/server';
import { Report, ReportCategory, SituationLevel } from '@/types';

const VALID_STATUSES = ['submitted', 'under_review', 'assigned', 'in_progress', 'resolved', 'rejected', 'closed'];
const VALID_CATEGORIES = ['electrical', 'plumbing', 'cleanliness', 'internet', 'furniture', 'safety', 'other'];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parsePagination(params: URLSearchParams) {
  const rawLimit = Number(params.get('limit'));
  const rawOffset = Number(params.get('offset'));
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 50) : 20;
  const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? Math.min(Math.floor(rawOffset), 1_000_000) : 0;
  return { limit, offset };
}

async function attachSignedPhotoUrls<T extends { college_id?: string | null; photo_paths?: unknown }>(
  reports: T[]
): Promise<Array<T & { photo_urls?: string[] }>> {
  return Promise.all(
    reports.map(async (report) => {
      if (!Array.isArray(report.photo_paths) || report.photo_paths.length === 0) {
        return report;
      }
      const photo_urls = await signReportPhotoPaths(report.photo_paths, report.college_id);
      return { ...report, photo_urls };
    })
  );
}

export async function GET(request: Request) {
  try {
    const { user, profile } = await getAuthContext(request);
    if (!user || !profile) return apiError('UNAUTHORIZED', 'Authentication required to view reports', 401);
    if (profile.role !== 'super_admin' && !profile.college_id) {
      return apiError('COLLEGE_REQUIRED', 'Your account is not assigned to a college', 400);
    }

    const params = new URL(request.url).searchParams;
    const { limit, offset } = parsePagination(params);
    const supabase = await createClient(request);
    const requestedCollegeId = params.get('college_id');
    if (requestedCollegeId && !UUID_PATTERN.test(requestedCollegeId)) {
      return apiError('VALIDATION_ERROR', 'Invalid college id', 400);
    }
    if (profile.role !== 'super_admin' && requestedCollegeId && requestedCollegeId !== profile.college_id) {
      return apiError('FORBIDDEN', 'You cannot view reports from another college', 403);
    }
    const collegeScope = profile.role === 'super_admin' ? requestedCollegeId : profile.college_id;

    let query = supabase
      .from('reports')
      .select('*, building:buildings(id, name, code), submitter:profiles!submitter_id(id, full_name, email)', {
        count: 'exact',
      })
      .order('created_at', { ascending: false });

    if (collegeScope) query = query.eq('college_id', collegeScope);

    const status = params.get('status');
    const category = params.get('category');
    const buildingId = params.get('building_id');
    const submitterId = params.get('submitter_id');
    const search = params.get('search');

    if (status && status !== 'all' && !VALID_STATUSES.includes(status)) {
      return apiError('VALIDATION_ERROR', 'Invalid report status filter', 400);
    }
    if (category && category !== 'all' && !VALID_CATEGORIES.includes(category)) {
      return apiError('VALIDATION_ERROR', 'Invalid report category filter', 400);
    }
    if (buildingId && buildingId !== 'all' && !UUID_PATTERN.test(buildingId)) {
      return apiError('VALIDATION_ERROR', 'Invalid building filter', 400);
    }
    if (submitterId && !UUID_PATTERN.test(submitterId)) {
      return apiError('VALIDATION_ERROR', 'Invalid submitter filter', 400);
    }

    if (status && status !== 'all') query = query.eq('status', status);
    if (category && category !== 'all') query = query.eq('category', category);
    if (buildingId && buildingId !== 'all') query = query.eq('building_id', buildingId);
    if (submitterId) query = query.eq('submitter_id', submitterId);
    const searchTerm = search?.trim().slice(0, 120).replace(/[,%()]/g, ' ');
    if (searchTerm) {
      const pattern = `%${searchTerm}%`;
      query = query.or(`title.ilike.${pattern},description.ilike.${pattern},tracking_id.ilike.${pattern},room.ilike.${pattern},building_label.ilike.${pattern}`);
    }

    const { data, count, error } = await query.range(offset, offset + limit - 1);
    if (error) {
      console.error('Reports list query error:', error);
      return apiError('DATABASE_ERROR', 'Could not load reports from the database', 500);
    }

    const rows = (data || []) as Array<Record<string, unknown> & { college_id?: string | null; photo_paths?: unknown }>;
    const enriched = await attachSignedPhotoUrls(rows);
    const total = typeof count === 'number' ? count : rows.length;

    let summary: Record<string, number> | undefined;
    if (params.get('include_summary') === 'true') {
      const statuses = ['submitted', 'under_review', 'assigned', 'in_progress', 'resolved', 'rejected', 'closed'] as const;
      const counts = await Promise.all(statuses.map(async (reportStatus) => {
        let countQuery = supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', reportStatus);
        if (collegeScope) countQuery = countQuery.eq('college_id', collegeScope);
        if (submitterId) countQuery = countQuery.eq('submitter_id', submitterId);
        const result = await countQuery;
        if (result.error) throw result.error;
        return [reportStatus, result.count ?? 0] as const;
      }));
      summary = Object.fromEntries(counts);
    }

    return NextResponse.json({
      data: enriched,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + rows.length < total,
      },
      ...(summary ? { summary } : {}),
    });
  } catch (err) {
    console.error('Reports GET unexpected error:', err);
    return apiError('INTERNAL_ERROR', 'Could not load reports from the database', 500);
  }
}

export async function POST(request: Request) {
  try {
    const originError = requireSameOrigin(request);
    if (originError) return originError;

    const { user, profile } = await getAuthContext(request);
    if (!user || !profile) return apiError('UNAUTHORIZED', 'Authentication required to create reports', 401);

    const rateLimit = await checkRateLimit({
      key: `reports:create:${user.id}`,
      limit: 10,
      windowSeconds: 3600,
    });
    if (!rateLimit.allowed) {
      return rateLimitErrorResponse(rateLimit.retryAfter);
    }

    const { data: body, errorResponse } = await requireJsonBody(request);
    if (errorResponse || !body) return errorResponse!;

    const validation = validateReportInput({
      title: typeof body.title === 'string' ? body.title : undefined,
      description: typeof body.description === 'string' ? body.description : undefined,
      category: typeof body.category === 'string' ? body.category : undefined,
      building_id: typeof body.building_id === 'string' && body.building_id.trim() ? body.building_id.trim() : null,
      building_label: typeof body.building_label === 'string' ? body.building_label : null,
    });
    if (!validation.isValid) {
      return apiError('VALIDATION_ERROR', Object.values(validation.errors).join(', '), 400, {
        field_errors: validation.errors,
      });
    }
    if (typeof body.title !== 'string' || typeof body.description !== 'string' || typeof body.category !== 'string') {
      return apiError('VALIDATION_ERROR', 'Report fields are invalid', 400);
    }

    const rawPhotoPaths = body.photo_paths;
    if (rawPhotoPaths !== undefined) {
      if (
        !Array.isArray(rawPhotoPaths) ||
        rawPhotoPaths.length > MAX_UPLOAD_FILES ||
        rawPhotoPaths.some((p) => typeof p !== 'string')
      ) {
        return apiError('VALIDATION_ERROR', `Up to ${MAX_UPLOAD_FILES} valid photo uploads are allowed.`, 400);
      }
    }

    const category = body.category as ReportCategory;
    const title = body.title;
    const description = body.description;
    const buildingId = typeof body.building_id === 'string' && body.building_id.trim()
      ? body.building_id.trim()
      : null;
    const buildingLabel = typeof body.building_label === 'string' && body.building_label.trim()
      ? body.building_label.trim()
      : null;

    const supabase = await createClient(request);
    const targetCollegeId = profile.role === 'super_admin' && typeof body.college_id === 'string'
      ? body.college_id
      : profile.college_id;
    if (!targetCollegeId) return apiError('COLLEGE_REQUIRED', 'Select an active college before creating a report', 400);

    const { data: college, error: collegeError } = await supabase
      .from('colleges')
      .select('id, slug, is_active')
      .eq('id', targetCollegeId)
      .maybeSingle();
    if (collegeError) {
      console.error('Report college lookup error:', collegeError);
      return apiError('DATABASE_ERROR', 'Could not verify the report college', 500);
    }
    if (!college?.is_active) return apiError('COLLEGE_NOT_FOUND', 'The selected college is not active', 404);
    if (profile.role !== 'super_admin' && profile.college_id !== college.id) {
      return apiError('FORBIDDEN', 'You cannot create reports for another college', 403);
    }

    const requestedSection = typeof body.section === 'string' && body.section.trim()
      ? body.section.trim().toUpperCase()
      : null;
    if (buildingId) {
      const { data: building, error: buildingError } = await supabase
        .from('buildings')
        .select('id, college_id, sections')
        .eq('id', buildingId)
        .eq('college_id', college.id)
        .eq('is_active', true)
        .maybeSingle();
      if (buildingError) {
        console.error('Report building lookup error:', buildingError);
        return apiError('DATABASE_ERROR', 'Could not verify the selected building', 500);
      }
      if (!building) return apiError('BUILDING_NOT_FOUND', 'Select a building from this campus.', 400);
      const configuredSections = Array.isArray(building.sections) ? building.sections as string[] : [];
      if (configuredSections.length > 0 && !requestedSection) {
        return apiError('VALIDATION_ERROR', 'Select a section for this building.', 400, {
          field_errors: { section: 'Select a section.' },
        });
      }
      if (requestedSection && !configuredSections.some((section) => section.toUpperCase() === requestedSection)) {
        return apiError('VALIDATION_ERROR', 'Select a section configured for this building.', 400, {
          field_errors: { section: 'Select a valid section.' },
        });
      }
    }

    const photoPaths: string[] = Array.isArray(rawPhotoPaths)
      ? rawPhotoPaths.filter((p): p is string => typeof p === 'string')
      : [];
    if (photoPaths.some((p) => !isValidReportPhotoPath(p, college.id))) {
      return apiError('VALIDATION_ERROR', 'One or more photo paths are invalid.', 400);
    }

    const { data: existingReports, error: duplicateQueryError } = await supabase
      .from('reports')
      .select('id, title, category, building_id, building_label, floor, room, tracking_id, status')
      .eq('college_id', college.id)
      .in('status', ['submitted', 'under_review', 'assigned', 'in_progress']);
    if (duplicateQueryError) {
      console.error('Report duplicate check error:', duplicateQueryError);
      return apiError('DATABASE_ERROR', 'Could not check existing reports', 500);
    }

    if (!body.force && !body.allow_duplicate) {
      const match = findPotentialDuplicates({
        title,
        description,
        category,
        building_id: buildingId,
        building_label: buildingLabel,
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

    let data = null;
    let error = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const result = await supabase.from('reports').insert([{
        college_id: college.id,
        submitter_id: user.id,
        building_id: buildingId,
        building_label: buildingLabel,
        tracking_id: generateTrackingId(college.slug),
        title: title.trim(),
        description: description.trim(),
        category,
        floor: typeof body.floor === 'string' ? body.floor : null,
        room: typeof body.room === 'string' ? body.room : null,
        section: requestedSection,
        situation: typeof body.situation === 'string' && ['normal', 'medium', 'high', 'critical'].includes(body.situation) ? body.situation as SituationLevel : 'normal',
        photo_paths: photoPaths,
        status: 'submitted',
        upvote_count: 0,
      }]).select('*, building:buildings(id, name, code), submitter:profiles!submitter_id(id, full_name, email)').single();
      data = result.data;
      error = result.error;
      if (!error || error.code !== '23505') break;
    }

    if (error || !data) {
      console.error('Report insert error:', error);
      return apiError('DATABASE_ERROR', 'Could not save the report', 500);
    }

    const photo_urls = photoPaths.length > 0 ? await signReportPhotoPaths(photoPaths, college.id) : [];
    return NextResponse.json({ data: { ...data, photo_urls } }, { status: 201 });
  } catch (err) {
    console.error('Reports POST unexpected error:', err);
    return apiError('INTERNAL_ERROR', 'Could not save the report', 500);
  }
}

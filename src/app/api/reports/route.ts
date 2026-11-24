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

function parsePagination(params: URLSearchParams) {
  const rawLimit = Number(params.get('limit'));
  const rawOffset = Number(params.get('offset'));
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 50) : 20;
  const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? Math.floor(rawOffset) : 0;
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

    let query = supabase
      .from('reports')
      .select('*, building:buildings(id, name, code), submitter:profiles!submitter_id(id, full_name, email)', {
        count: 'exact',
      })
      .order('created_at', { ascending: false });

    if (profile.college_id) query = query.eq('college_id', profile.college_id);

    const status = params.get('status');
    const category = params.get('category');
    const buildingId = params.get('building_id');
    const submitterId = params.get('submitter_id');
    const search = params.get('search');

    if (status && status !== 'all') query = query.eq('status', status);
    if (category && category !== 'all') query = query.eq('category', category);
    if (buildingId && buildingId !== 'all') query = query.eq('building_id', buildingId);
    if (submitterId) query = query.eq('submitter_id', submitterId);
    if (search?.trim()) query = query.ilike('title', `%${search.trim()}%`);

    const { data, count, error } = await query.range(offset, offset + limit - 1);
    if (error) {
      console.error('Reports list query error:', error);
      return apiError('DATABASE_ERROR', 'Could not load reports from the database', 500);
    }

    const rows = (data || []) as Array<Record<string, unknown> & { college_id?: string | null; photo_paths?: unknown }>;
    const enriched = await attachSignedPhotoUrls(rows);
    const total = typeof count === 'number' ? count : rows.length;

    return NextResponse.json({
      data: enriched,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + rows.length < total,
      },
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

    const photoPaths: string[] = Array.isArray(rawPhotoPaths)
      ? rawPhotoPaths.filter((p): p is string => typeof p === 'string')
      : [];
    if (photoPaths.some((p) => !isValidReportPhotoPath(p, college.id))) {
      return apiError('VALIDATION_ERROR', 'One or more photo paths are invalid.', 400);
    }

    const { data: existingReports, error: duplicateQueryError } = await supabase
      .from('reports')
      .select('id, title, description, category, building_id, building_label, floor, room, tracking_id, college_id, submitter_id, status, upvote_count, photo_paths, created_at, updated_at')
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

    const { data, error } = await supabase.from('reports').insert([{
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
      section: typeof body.section === 'string' ? body.section : null,
      situation: typeof body.situation === 'string' && ['normal', 'medium', 'high', 'critical'].includes(body.situation) ? body.situation as SituationLevel : 'normal',
      photo_paths: photoPaths,
      status: 'submitted',
      upvote_count: 0,
    }]).select('*, building:buildings(id, name, code), submitter:profiles!submitter_id(id, full_name, email)').single();

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

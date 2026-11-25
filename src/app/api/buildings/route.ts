import { NextResponse } from 'next/server';
import { getAuthContext, apiError, requireJsonBody, requireSameOrigin } from '@/lib/serverAuth';
import { normalizeBuildingSections, validateBuildingInput } from '@/lib/validators';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { user, profile } = await getAuthContext(request);
    if (!user || !profile) return apiError('UNAUTHORIZED', 'Authentication required', 401);
    if (!profile.college_id) return NextResponse.json({ data: [] });

    const supabase = await createClient(request);
    const { data, error } = await supabase.from('buildings').select('*').eq('college_id', profile.college_id).order('name');
    if (error) {
      console.error('Buildings GET error:', error);
      return apiError('DATABASE_ERROR', 'Could not load campus buildings', 500);
    }
    return NextResponse.json({ data: data || [] });
  } catch (err) {
    console.error('Buildings GET unexpected error:', err);
    return apiError('INTERNAL_ERROR', 'Could not load campus buildings', 500);
  }
}

export async function POST(request: Request) {
  try {
    const originError = requireSameOrigin(request);
    if (originError) return originError;

    const { user, profile } = await getAuthContext(request);
    if (!user || !profile) return apiError('UNAUTHORIZED', 'Authentication required', 401);
    if (profile.role !== 'admin' && profile.role !== 'super_admin') {
      return apiError('FORBIDDEN', 'Admin permission required to create buildings', 403);
    }
    if (!profile.college_id) return apiError('COLLEGE_REQUIRED', 'A college workspace is required', 400);

    const { data: body, errorResponse } = await requireJsonBody(request);
    if (errorResponse || !body) return errorResponse!;

    const name = typeof body.name === 'string' ? body.name : '';
    const code = typeof body.code === 'string' ? body.code : '';
    const floorCount = typeof body.floor_count === 'number' && Number.isInteger(body.floor_count) ? body.floor_count : 5;
    if (floorCount < 0 || floorCount > 25) return apiError('VALIDATION_ERROR', 'Floor count must be between 0 and 25', 400);
    const normalizedSections = normalizeBuildingSections(body.sections ?? []);
    if (normalizedSections.error || !normalizedSections.sections) {
      return apiError('VALIDATION_ERROR', normalizedSections.error || 'Section list is invalid.', 400);
    }
    const validation = validateBuildingInput({ name, code });
    if (!validation.isValid) return apiError('VALIDATION_ERROR', Object.values(validation.errors).join(', '), 400);

    const supabase = await createClient(request);
    const { data, error } = await supabase.from('buildings').insert([{
      college_id: profile.college_id,
      name: name.trim(),
      code: code.trim().toUpperCase() || null,
      floor_count: floorCount,
      sections: normalizedSections.sections,
      is_active: true,
    }]).select().single();
    if (error) {
      console.error('Buildings POST error:', error);
      if (error.code === '23505') {
        return apiError('BUILDING_EXISTS', 'A building with this code already exists.', 409);
      }
      return apiError('DATABASE_ERROR', 'Could not add this building', 500);
    }
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error('Buildings POST unexpected error:', err);
    return apiError('INTERNAL_ERROR', 'Could not add this building', 500);
  }
}

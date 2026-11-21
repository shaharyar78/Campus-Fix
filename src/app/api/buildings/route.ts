import { NextResponse } from 'next/server';
import { getAuthContext, apiError } from '@/lib/serverAuth';
import { isRecord, validateBuildingInput } from '@/lib/validators';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const { user, profile } = await getAuthContext();
  if (!user || !profile) return apiError('UNAUTHORIZED', 'Authentication required', 401);
  if (!profile.college_id) return NextResponse.json({ data: [] });

  const supabase = await createClient();
  const { data, error } = await supabase.from('buildings').select('*').eq('college_id', profile.college_id).order('name');
  if (error) return apiError('DATABASE_ERROR', 'Could not load campus buildings', 500);
  return NextResponse.json({ data: data || [] });
}

export async function POST(request: Request) {
  const { user, profile } = await getAuthContext(request);
  if (!user || !profile) return apiError('UNAUTHORIZED', 'Authentication required', 401);
  if (profile.role !== 'admin' && profile.role !== 'super_admin') {
    return apiError('FORBIDDEN', 'Admin permission required to create buildings', 403);
  }
  if (!profile.college_id) return apiError('COLLEGE_REQUIRED', 'A college workspace is required', 400);

  let payload: unknown;
  try { payload = await request.json(); } catch { return apiError('BAD_REQUEST', 'Invalid JSON body', 400); }
  if (!isRecord(payload)) return apiError('BAD_REQUEST', 'Invalid JSON body', 400);
  const body = payload;
  const name = typeof body.name === 'string' ? body.name : '';
  const code = typeof body.code === 'string' ? body.code : '';
  const floorCount = typeof body.floor_count === 'number' && Number.isInteger(body.floor_count) ? body.floor_count : 5;
  if (floorCount < 0 || floorCount > 25) return apiError('VALIDATION_ERROR', 'Floor count must be between 0 and 25', 400);
  const validation = validateBuildingInput({ name, code });
  if (!validation.isValid) return apiError('VALIDATION_ERROR', Object.values(validation.errors).join(', '), 400);

  const supabase = await createClient();
  const { data, error } = await supabase.from('buildings').insert([{
    college_id: profile.college_id,
    name: name.trim(),
    code: code.trim().toUpperCase() || null,
    floor_count: floorCount,
    is_active: true,
  }]).select().single();
  if (error) return apiError('DATABASE_ERROR', error.message, 500);
  return NextResponse.json({ data }, { status: 201 });
}

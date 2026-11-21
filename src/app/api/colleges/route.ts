import { NextResponse } from 'next/server';
import { getAuthContext, apiError } from '@/lib/serverAuth';
import { createClient } from '@/lib/supabase/server';
import { isRecord, validateCollegeInput } from '@/lib/validators';

function normalizeCollegeInput(body: Record<string, unknown>) {
  return {
    name: typeof body.name === 'string' ? body.name.trim() : '',
    slug: typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : '',
    email_domain: typeof body.email_domain === 'string' ? body.email_domain.trim().toLowerCase().replace(/^@/, '') : '',
    address: typeof body.address === 'string' ? body.address.trim() : '',
  };
}

function validateCollege(body: Record<string, unknown>) {
  const input = normalizeCollegeInput(body);
  const validation = validateCollegeInput(input);
  if (!validation.isValid) return { input, error: Object.values(validation.errors).join(' ') };
  const emailDomains = input.email_domain.split(',').map((domain) => domain.trim()).filter(Boolean);
  if (emailDomains.some((domain) => !/^(?=.{3,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(domain))) {
    return { input, error: 'Enter a valid email domain, such as college.edu.' };
  }
  return { input, error: null };
}

export async function GET() {
  const { user } = await getAuthContext();
  if (!user) return apiError('UNAUTHORIZED', 'Authentication required', 401);

  const supabase = await createClient();
  const { data, error } = await supabase.from('colleges').select('*').eq('is_active', true).order('name');
  if (error) return apiError('DATABASE_ERROR', 'Could not load colleges', 500);
  return NextResponse.json({ data: data || [] });
}

export async function POST(request: Request) {
  const { user, profile } = await getAuthContext(request);
  if (!user || !profile) return apiError('UNAUTHORIZED', 'Authentication required', 401);
  if (profile.role !== 'super_admin') return apiError('FORBIDDEN', 'Only super-admins can add colleges', 403);

  let payload: unknown;
  try { payload = await request.json(); } catch { return apiError('BAD_REQUEST', 'Invalid JSON body', 400); }
  if (!isRecord(payload)) return apiError('BAD_REQUEST', 'Invalid JSON body', 400);
  const { input, error: validationError } = validateCollege(payload);
  if (validationError) return apiError('VALIDATION_ERROR', validationError, 400);

  const supabase = await createClient();
  const { data, error } = await supabase.from('colleges').insert({
    name: input.name,
    slug: input.slug,
    email_domain: input.email_domain || null,
    address: input.address || null,
    is_active: true,
  }).select('*').single();
  if (error) {
    if (error.code === '23505') return apiError('COLLEGE_EXISTS', 'A college with this slug already exists', 409);
    return apiError('DATABASE_ERROR', 'Could not add this college', 500);
  }
  return NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const { user, profile } = await getAuthContext(request);
  if (!user || !profile) return apiError('UNAUTHORIZED', 'Authentication required', 401);
  if (profile.role !== 'super_admin') return apiError('FORBIDDEN', 'Only super-admins can update colleges', 403);

  let payload: unknown;
  try { payload = await request.json(); } catch { return apiError('BAD_REQUEST', 'Invalid JSON body', 400); }
  if (!isRecord(payload) || typeof payload.id !== 'string') return apiError('BAD_REQUEST', 'College ID is required', 400);
  const { input, error: validationError } = validateCollege(payload);
  if (validationError) return apiError('VALIDATION_ERROR', validationError, 400);

  const supabase = await createClient();
  const { data, error } = await supabase.from('colleges').update({
    name: input.name,
    slug: input.slug,
    email_domain: input.email_domain || null,
    address: input.address || null,
  }).eq('id', payload.id).select('*').maybeSingle();
  if (error) {
    if (error.code === '23505') return apiError('COLLEGE_EXISTS', 'A college with this slug already exists', 409);
    return apiError('DATABASE_ERROR', 'Could not update this college', 500);
  }
  if (!data) return apiError('NOT_FOUND', 'College not found', 404);
  return NextResponse.json({ data });
}

import { NextResponse } from 'next/server';
import { getAuthContext, apiError } from '@/lib/serverAuth';
import { createClient } from '@/lib/supabase/server';
import { isRecord } from '@/lib/validators';

export async function GET(request: Request) {
  const { user, profile } = await getAuthContext(request);
  if (!user || !profile) return apiError('UNAUTHORIZED', 'Authentication required to view messages', 401);
  const params = new URL(request.url).searchParams;
  const reportId = params.get('report_id');
  const supabase = await createClient();
  const requestedCollegeId = params.get('college_id');
  const collegeId = profile.role === 'super_admin' ? requestedCollegeId : profile.college_id;
  if (!collegeId) return apiError('COLLEGE_REQUIRED', 'Select a campus to open its chat', 400);
  if (profile.role === 'super_admin') {
    const { data: college } = await supabase.from('colleges').select('id').eq('id', collegeId).eq('is_active', true).maybeSingle();
    if (!college) return apiError('COLLEGE_NOT_FOUND', 'The selected campus is not active', 404);
  }
  let query = supabase
    .from('messages')
    .select('*, sender:profiles!sender_id(id, full_name, email, role)')
    .eq('college_id', collegeId)
    .order('created_at', { ascending: true });
  query = reportId ? query.eq('report_id', reportId) : query.is('report_id', null);
  const { data, error } = await query;
  if (error) return apiError('DATABASE_ERROR', 'Could not load messages from the database', 500);
  return NextResponse.json({ data: data || [] });
}

export async function POST(request: Request) {
  const { user, profile } = await getAuthContext(request);
  if (!user || !profile) return apiError('UNAUTHORIZED', 'Authentication required to send messages', 401);

  let payload: unknown;
  try { payload = await request.json(); } catch { return apiError('BAD_REQUEST', 'Invalid JSON body', 400); }
  if (!isRecord(payload) || typeof payload.body !== 'string' || !payload.body.trim()) return apiError('VALIDATION_ERROR', 'Message body cannot be empty', 400);
  const body = payload;
  const messageBody = typeof body.body === 'string' ? body.body : '';
  if (messageBody.length > 4000) return apiError('VALIDATION_ERROR', 'Message body cannot exceed 4000 characters', 400);

  const supabase = await createClient();
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
  if (error) return apiError('DATABASE_ERROR', 'Could not save the message', 500);
  return NextResponse.json({ data }, { status: 201 });
}

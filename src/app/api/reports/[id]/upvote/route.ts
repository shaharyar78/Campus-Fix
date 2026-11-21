import { NextResponse } from 'next/server';
import { getAuthContext, apiError } from '@/lib/serverAuth';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, profile } = await getAuthContext(request);
  if (!user || !profile) return apiError('UNAUTHORIZED', 'Authentication required to upvote', 401);
  if (profile.role !== 'super_admin' && !profile.college_id) return apiError('COLLEGE_REQUIRED', 'Your account is not assigned to a college', 400);
  const { id } = await params;
  const supabase = await createClient();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  let reportQuery = supabase.from('reports').select('id, upvote_count').limit(1);
  if (profile.role !== 'super_admin' && profile.college_id) reportQuery = reportQuery.eq('college_id', profile.college_id);
  reportQuery = isUuid ? reportQuery.eq('id', id) : reportQuery.eq('tracking_id', id);
  const { data: report, error: reportError } = await reportQuery.maybeSingle();
  if (reportError) return apiError('DATABASE_ERROR', 'Could not load this report', 500);
  if (!report) return apiError('NOT_FOUND', 'Report not found', 404);

  const { data: vote, error: voteError } = await supabase.from('report_upvotes')
    .select('report_id').eq('report_id', report.id).eq('user_id', user.id).maybeSingle();
  if (voteError) return apiError('DATABASE_ERROR', 'Could not check your vote', 500);

  const result = vote
    ? await supabase.from('report_upvotes').delete().eq('report_id', report.id).eq('user_id', user.id)
    : await supabase.from('report_upvotes').insert([{ report_id: report.id, user_id: user.id }]);
  if (result.error) return apiError('DATABASE_ERROR', 'Could not save your vote', 500);

  const { data: updated, error: countError } = await supabase.from('reports').select('upvote_count').eq('id', report.id).single();
  if (countError) return apiError('DATABASE_ERROR', 'Vote saved, but the count could not be loaded', 500);
  return NextResponse.json({ data: { report_id: report.id, upvote_count: updated.upvote_count, has_upvoted: !vote } });
}

import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getMockStore } from '@/lib/supabase/mockStore';
import { apiError, getAuthContext } from '@/lib/serverAuth';
import { verifyMockSignedUploadUrl } from '@/lib/reportPhotos';

export async function GET(request: Request) {
  try {
    if (isSupabaseConfigured()) {
      return apiError('NOT_FOUND', 'Not found', 404);
    }

    const { user, profile } = await getAuthContext(request);
    if (!user || !profile) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401);
    }

    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '';
    const exp = searchParams.get('exp') || '';
    const sig = searchParams.get('sig') || '';

    if (!verifyMockSignedUploadUrl(path, exp, sig)) {
      return apiError('FORBIDDEN', 'Upload link expired or invalid', 403);
    }

    const store = getMockStore();
    const entry = store.uploads[path];
    if (!entry) {
      return apiError('NOT_FOUND', 'File not found', 404);
    }

    if (profile.role !== 'super_admin' && profile.college_id !== entry.collegeId) {
      return apiError('FORBIDDEN', 'Cross-college access denied', 403);
    }

    return new NextResponse(new Uint8Array(entry.buffer), {
      status: 200,
      headers: {
        'Content-Type': entry.mimeType,
        'Cache-Control': 'private, max-age=300',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    console.error('Upload file retrieval error:', err);
    return apiError('INTERNAL_ERROR', 'Could not load uploaded image.', 500);
  }
}

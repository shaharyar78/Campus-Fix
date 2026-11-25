import { NextResponse } from 'next/server';
import { apiError, getAuthContext, requireSameOrigin } from '@/lib/serverAuth';
import { checkRateLimit, rateLimitErrorResponse } from '@/lib/rateLimit';
import {
  MAX_UPLOAD_FILE_BYTES,
  validateAndSanitizeImage,
} from '@/lib/imageSecurity';
import { storeSanitizedReportPhoto } from '@/lib/reportPhotos';

export async function POST(request: Request) {
  try {
    const originError = requireSameOrigin(request);
    if (originError) return originError;

    const { user, profile } = await getAuthContext(request);
    if (!user || !profile) {
      return apiError('UNAUTHORIZED', 'Authentication required to upload photos', 401);
    }

    const limitResult = await checkRateLimit({
      key: `upload:${user.id}`,
      limit: 20,
      windowSeconds: 3600,
    });
    if (!limitResult.allowed) {
      return rateLimitErrorResponse(limitResult.retryAfter, 'api');
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('multipart/form-data')) {
      return apiError('UNSUPPORTED_MEDIA_TYPE', 'Content-Type must be multipart/form-data', 415);
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return apiError('BAD_REQUEST', 'Invalid upload form payload', 400);
    }

    const targetCollegeId =
      profile.role === 'super_admin' && typeof formData.get('college_id') === 'string'
        ? String(formData.get('college_id')).trim()
        : profile.college_id;

    if (!targetCollegeId) {
      return apiError('COLLEGE_REQUIRED', 'Select an active college before uploading photos', 400);
    }

    const entries = formData.getAll('files');
    const files = entries.filter((entry): entry is File => entry instanceof File);

    if (files.length === 0) {
      return apiError('VALIDATION_ERROR', 'Select at least one image file to upload.', 400);
    }
    if (files.length > 1) {
      return apiError(
        'VALIDATION_ERROR',
        'Upload one image per request. You can attach up to three images to a report.',
        400
      );
    }

    const uploaded: Array<{ path: string; signedUrl: string | null; metadataStripped: boolean }> = [];

    for (const file of files) {
      if (file.size > MAX_UPLOAD_FILE_BYTES) {
        return apiError('VALIDATION_ERROR', 'Each image must be 5 MB or smaller.', 400);
      }
      const rawBuffer = Buffer.from(await file.arrayBuffer());
      const sanitized = validateAndSanitizeImage(rawBuffer, file.type);
      if (!sanitized.valid || !sanitized.buffer || !sanitized.mimeType || !sanitized.ext) {
        return apiError('VALIDATION_ERROR', sanitized.error || 'Invalid image file.', 400);
      }

      try {
        const stored = await storeSanitizedReportPhoto({
          collegeId: targetCollegeId,
          userId: user.id,
          buffer: sanitized.buffer,
          mimeType: sanitized.mimeType,
          ext: sanitized.ext,
        });
        uploaded.push({
          path: stored.path,
          signedUrl: stored.signedUrl,
          metadataStripped: Boolean(sanitized.metadataStripped),
        });
      } catch (err) {
        console.error('Upload persistence error:', err);
        return apiError('UPLOAD_ERROR', 'Could not store uploaded image.', 500);
      }
    }

    return NextResponse.json({ data: uploaded }, { status: 201 });
  } catch (err) {
    console.error('Upload unexpected error:', err);
    return apiError('INTERNAL_ERROR', 'Could not process image upload.', 500);
  }
}

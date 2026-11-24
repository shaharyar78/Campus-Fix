import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createServiceClient } from '@/lib/supabase/server';
import { getMockStore } from '@/lib/supabase/mockStore';
import { isValidReportPhotoPath, type AllowedImageMimeType } from '@/lib/imageSecurity';

const REPORT_PHOTOS_BUCKET = 'report-photos';
const SIGNED_URL_TTL_SECONDS = 300; // 5 minutes

function getMockUploadSigningKey(): string {
  const configured = process.env.MOCK_SESSION_SECRET?.trim();
  if (!configured) {
    throw new Error('MOCK_SESSION_SECRET is required for mock upload signing.');
  }
  return configured;
}

export function createMockSignedUploadUrl(path: string, ttlSeconds = SIGNED_URL_TTL_SECONDS): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${path}:${exp}`;
  const sig = createHmac('sha256', getMockUploadSigningKey()).update(payload).digest('base64url');
  const params = new URLSearchParams({ path, exp: String(exp), sig });
  return `/api/uploads/file?${params.toString()}`;
}

export function verifyMockSignedUploadUrl(path: string, expRaw: string, sig: string): boolean {
  if (!path || !expRaw || !sig) return false;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;

  try {
    const expected = createHmac('sha256', getMockUploadSigningKey())
      .update(`${path}:${exp}`)
      .digest('base64url');
    const a = Buffer.from(sig, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function storeSanitizedReportPhoto(params: {
  collegeId: string;
  userId: string;
  buffer: Buffer;
  mimeType: AllowedImageMimeType;
  ext: 'jpg' | 'png' | 'webp';
}): Promise<{ path: string; signedUrl: string | null }> {
  const path = `${params.collegeId}/${params.userId}/${randomUUID()}.${params.ext}`;

  if (isSupabaseConfigured()) {
    const serviceClient = createServiceClient();
    const { error } = await serviceClient.storage
      .from(REPORT_PHOTOS_BUCKET)
      .upload(path, params.buffer, {
        contentType: params.mimeType,
        upsert: false,
        cacheControl: '3600',
      });
    if (error) {
      console.error('Supabase storage upload error:', error);
      throw new Error('Could not store uploaded image.');
    }

    const { data: signedData } = await serviceClient.storage
      .from(REPORT_PHOTOS_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

    return { path, signedUrl: signedData?.signedUrl || null };
  }

  const store = getMockStore();
  store.uploads[path] = {
    buffer: params.buffer,
    mimeType: params.mimeType,
    collegeId: params.collegeId,
    userId: params.userId,
  };
  return {
    path,
    signedUrl: createMockSignedUploadUrl(path),
  };
}

export async function signReportPhotoPaths(
  paths: unknown,
  collegeId?: string | null
): Promise<string[]> {
  if (!Array.isArray(paths) || paths.length === 0) return [];
  const validPaths = paths
    .filter((entry): entry is string => typeof entry === 'string')
    .filter((entry) => isValidReportPhotoPath(entry, collegeId || undefined));

  if (validPaths.length === 0) return [];

  if (isSupabaseConfigured()) {
    const serviceClient = createServiceClient();
    const { data, error } = await serviceClient.storage
      .from(REPORT_PHOTOS_BUCKET)
      .createSignedUrls(validPaths, SIGNED_URL_TTL_SECONDS);

    if (error || !data) {
      console.error('Signed URL generation error:', error);
      return [];
    }

    return data
      .map((item) => item.signedUrl)
      .filter((url): url is string => typeof url === 'string' && url.length > 0);
  }

  return validPaths.map((p) => createMockSignedUploadUrl(p));
}

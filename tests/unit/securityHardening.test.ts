import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  checkRateLimit,
  normalizeRedisUrl,
  rateLimitErrorResponse,
  resetRateLimitStore,
} from '../../src/lib/rateLimit';
import {
  detectImageMimeFromMagicBytes,
  isSafeDisplayImageUrl,
  isValidReportPhotoPath,
  MAX_UPLOAD_FILE_BYTES,
  validateAndSanitizeImage,
} from '../../src/lib/imageSecurity';
import { requireJsonBody, requireSameOrigin } from '../../src/lib/serverAuth';

function makeMinimalJpegWithExif(): Buffer {
  // SOI + APP1 (EXIF GPS payload) + SOF0 + EOI
  const soi = Buffer.from([0xff, 0xd8]);
  const exifPayload = Buffer.from('Exif\0\0GPS_COORDS_37_7749_N_122_4194_W', 'ascii');
  const app1Len = 2 + exifPayload.length;
  const app1Header = Buffer.from([0xff, 0xe1, (app1Len >> 8) & 0xff, app1Len & 0xff]);
  const sof0 = Buffer.from([0xff, 0xc0, 0x00, 0x05, 0x08, 0x00, 0x01]);
  const sos = Buffer.from([0xff, 0xda, 0x00, 0x04, 0x00, 0x00]);
  const eoi = Buffer.from([0xff, 0xd9]);
  return Buffer.concat([soi, app1Header, exifPayload, sof0, sos, eoi]);
}

function makeMinimalPngWithExif(): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const mkChunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4);
    return Buffer.concat([len, typeBuf, data, crc]);
  };
  const ihdr = mkChunk('IHDR', Buffer.alloc(13));
  const exif = mkChunk('eXIf', Buffer.from('GPS_TAG', 'ascii'));
  const text = mkChunk('tEXt', Buffer.from('Comment\0secret', 'ascii'));
  const iend = mkChunk('IEND', Buffer.alloc(0));
  return Buffer.concat([sig, ihdr, exif, text, iend]);
}

function makeMinimalWebpWithExif(): Buffer {
  const mkChunk = (fourCc: string, data: Buffer) => {
    const header = Buffer.alloc(8);
    header.write(fourCc, 0, 'ascii');
    header.writeUInt32LE(data.length, 4);
    const pad = data.length % 2 === 1 ? Buffer.from([0x00]) : Buffer.alloc(0);
    return Buffer.concat([header, data, pad]);
  };
  const vp8xData = Buffer.from([0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x01, 0x00, 0x00]);
  const vp8x = mkChunk('VP8X', vp8xData);
  const vp8 = mkChunk('VP8 ', Buffer.from([0x00, 0x01, 0x02, 0x03]));
  const exif = mkChunk('EXIF', Buffer.from('GPS_EXIF_DATA', 'ascii'));
  const body = Buffer.concat([vp8x, vp8, exif]);
  const riff = Buffer.alloc(12);
  riff.write('RIFF', 0, 'ascii');
  riff.writeUInt32LE(4 + body.length, 4);
  riff.write('WEBP', 8, 'ascii');
  return Buffer.concat([riff, body]);
}

describe('Security Hardening Utilities', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetRateLimitStore();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('enforces in-memory rate limiting with Retry-After headers', async () => {
    for (let i = 0; i < 3; i += 1) {
      const res = await checkRateLimit({ key: 'test-key', limit: 3, windowSeconds: 60 });
      expect(res.allowed).toBe(true);
    }

    const blocked = await checkRateLimit({ key: 'test-key', limit: 3, windowSeconds: 60 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);

    const httpResp = rateLimitErrorResponse(blocked.retryAfter);
    expect(httpResp.status).toBe(429);
    expect(httpResp.headers.get('Retry-After')).toBe(String(blocked.retryAfter));
  });

  it('normalizes REDIS_URL strings and falls back safely when invalid', async () => {
    expect(normalizeRedisUrl(undefined)).toBeNull();
    expect(normalizeRedisUrl('https://not-redis.example.com')).toBeNull();
    expect(normalizeRedisUrl('redis://default:secret@localhost:6379')).toBe(
      'redis://default:secret@localhost:6379'
    );
    expect(normalizeRedisUrl('redis-cli -u rediss://default:secret@example.com:6380')).toBe(
      'rediss://default:secret@example.com:6380'
    );

    process.env.REDIS_URL = 'invalid-scheme://localhost';
    const fallbackResult = await checkRateLimit({ key: 'redis-fallback', limit: 2, windowSeconds: 60 });
    expect(fallbackResult.allowed).toBe(true);
    expect(fallbackResult.remaining).toBe(1);
  });

  it('validates image magic bytes and rejects mismatched MIME types or oversized files', () => {
    const fakeJpeg = Buffer.from('not-actually-an-image-bytes');
    expect(detectImageMimeFromMagicBytes(fakeJpeg)).toBeNull();
    const invalid = validateAndSanitizeImage(fakeJpeg, 'image/jpeg');
    expect(invalid.valid).toBe(false);

    const png = makeMinimalPngWithExif();
    const mismatch = validateAndSanitizeImage(png, 'image/jpeg');
    expect(mismatch.valid).toBe(false);

    const oversized = Buffer.alloc(MAX_UPLOAD_FILE_BYTES + 1);
    expect(validateAndSanitizeImage(oversized, 'image/png').valid).toBe(false);
  });

  it('strips EXIF/GPS metadata from JPEG, PNG, and WebP images', () => {
    const jpeg = makeMinimalJpegWithExif();
    const cleanJpeg = validateAndSanitizeImage(jpeg, 'image/jpeg');
    expect(cleanJpeg.valid).toBe(true);
    expect(cleanJpeg.metadataStripped).toBe(true);
    expect(cleanJpeg.buffer?.includes(Buffer.from('GPS_COORDS'))).toBe(false);

    const png = makeMinimalPngWithExif();
    const cleanPng = validateAndSanitizeImage(png, 'image/png');
    expect(cleanPng.valid).toBe(true);
    expect(cleanPng.metadataStripped).toBe(true);
    expect(cleanPng.buffer?.includes(Buffer.from('GPS_TAG'))).toBe(false);
    expect(cleanPng.buffer?.includes(Buffer.from('Comment'))).toBe(false);

    const webp = makeMinimalWebpWithExif();
    const cleanWebp = validateAndSanitizeImage(webp, 'image/webp');
    expect(cleanWebp.valid).toBe(true);
    expect(cleanWebp.metadataStripped).toBe(true);
    expect(cleanWebp.buffer?.includes(Buffer.from('GPS_EXIF_DATA'))).toBe(false);
  });

  it('validates report photo storage paths and display image URLs safely', () => {
    const validPath = '11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222/33333333-3333-3333-3333-333333333333.jpg';
    expect(isValidReportPhotoPath(validPath, '11111111-1111-1111-1111-111111111111')).toBe(true);
    expect(isValidReportPhotoPath('../secret.jpg')).toBe(false);
    expect(isValidReportPhotoPath(validPath, '99999999-9999-9999-9999-999999999999')).toBe(false);

    expect(isSafeDisplayImageUrl('https://project.supabase.co/storage/v1/object/sign/report-photos/a.jpg')).toBe(true);
    expect(isSafeDisplayImageUrl('/api/uploads/file?path=x&exp=1&sig=y')).toBe(true);
    expect(isSafeDisplayImageUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeDisplayImageUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
  });

  it('rejects cross-origin state changes and non-JSON payloads in API helpers', async () => {
    const crossOrigin = new Request('http://127.0.0.1:3000/api/reports', {
      method: 'POST',
      headers: {
        host: 'campus-fix.example.com',
        origin: 'https://attacker.example.com',
      },
    });
    expect(requireSameOrigin(crossOrigin)?.status).toBe(403);

    const badMedia = new Request('http://127.0.0.1:3000/api/reports', {
      method: 'POST',
      headers: {
        'content-type': 'text/plain',
      },
      body: '{"title":"test"}',
    });
    const mediaResult = await requireJsonBody(badMedia);
    expect(mediaResult.errorResponse?.status).toBe(415);

    const badJson = new Request('http://127.0.0.1:3000/api/reports', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: '{invalid-json',
    });
    const jsonResult = await requireJsonBody(badJson);
    expect(jsonResult.errorResponse?.status).toBe(400);
  });
});

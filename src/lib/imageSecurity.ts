export const MAX_UPLOAD_FILES = 3;
export const MAX_UPLOAD_FILE_BYTES = 5 * 1024 * 1024;

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export interface SanitizedImageResult {
  valid: boolean;
  mimeType?: AllowedImageMimeType;
  ext?: 'jpg' | 'png' | 'webp';
  buffer?: Buffer;
  metadataStripped?: boolean;
  error?: string;
}

export function detectImageMimeFromMagicBytes(buf: Buffer): AllowedImageMimeType | null {
  if (buf.length < 12) return null;

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return 'image/png';
  }

  // WebP: RIFF <4 bytes> WEBP
  if (
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }

  return null;
}

function stripJpegMetadata(buf: Buffer): { buffer: Buffer; stripped: boolean } | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;

  const chunks: Buffer[] = [buf.subarray(0, 2)];
  let pos = 2;
  let stripped = false;

  while (pos < buf.length) {
    if (buf[pos] !== 0xff) return null;

    // Skip fill bytes
    while (pos < buf.length && buf[pos] === 0xff) {
      pos += 1;
    }
    if (pos >= buf.length) break;

    const marker = buf[pos];
    pos += 1;

    // EOI or standalone markers (RST0..RST7, TEM)
    if (marker === 0xd9) {
      chunks.push(Buffer.from([0xff, 0xd9]));
      return { buffer: Buffer.concat(chunks), stripped };
    }
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      chunks.push(Buffer.from([0xff, marker]));
      continue;
    }

    // Start of Scan: keep SOS header + entropy-coded stream through EOF
    if (marker === 0xda) {
      chunks.push(Buffer.from([0xff, 0xda]));
      chunks.push(buf.subarray(pos));
      return { buffer: Buffer.concat(chunks), stripped };
    }

    if (pos + 2 > buf.length) return null;
    const segmentLength = buf.readUInt16BE(pos);
    if (segmentLength < 2 || pos + segmentLength > buf.length) return null;

    // Strip APP1..APP15 (except APP0 JFIF) and COM (0xFE) to remove EXIF, GPS, XMP, IPTC, comments
    const isMetadataMarker = (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe;
    if (isMetadataMarker) {
      stripped = true;
    } else {
      chunks.push(Buffer.from([0xff, marker]));
      chunks.push(buf.subarray(pos, pos + segmentLength));
    }

    pos += segmentLength;
  }

  return { buffer: Buffer.concat(chunks), stripped };
}

function stripPngMetadata(buf: Buffer): { buffer: Buffer; stripped: boolean } | null {
  const sig = buf.subarray(0, 8);
  const chunks: Buffer[] = [sig];
  let pos = 8;
  let stripped = false;
  let sawIhdr = false;
  let sawIend = false;

  const stripTypes = new Set(['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME']);

  while (pos + 12 <= buf.length) {
    const length = buf.readUInt32BE(pos);
    const type = buf.subarray(pos + 4, pos + 8).toString('ascii');
    const totalChunkSize = 12 + length;

    if (pos + totalChunkSize > buf.length) return null;
    if (type === 'IHDR') sawIhdr = true;
    if (type === 'IEND') sawIend = true;

    if (stripTypes.has(type)) {
      stripped = true;
    } else {
      chunks.push(buf.subarray(pos, pos + totalChunkSize));
    }

    pos += totalChunkSize;
    if (type === 'IEND') break;
  }

  if (!sawIhdr || !sawIend) return null;
  return { buffer: Buffer.concat(chunks), stripped };
}

function stripWebpMetadata(buf: Buffer): { buffer: Buffer; stripped: boolean } | null {
  if (buf.length < 12) return null;

  const chunks: Buffer[] = [];
  let pos = 12;
  let stripped = false;

  while (pos + 8 <= buf.length) {
    const fourCc = buf.subarray(pos, pos + 4).toString('ascii');
    const chunkSize = buf.readUInt32LE(pos + 4);
    const paddedSize = chunkSize + (chunkSize % 2);
    const totalSize = 8 + paddedSize;

    if (pos + 8 + chunkSize > buf.length) return null;
    const sliceEnd = Math.min(buf.length, pos + totalSize);

    if (fourCc === 'EXIF' || fourCc === 'XMP ') {
      stripped = true;
    } else if (fourCc === 'VP8X' && chunkSize >= 1) {
      const copy = Buffer.from(buf.subarray(pos, sliceEnd));
      // Clear EXIF (bit 3 = 0x08) and XMP (bit 2 = 0x04) metadata flags in VP8X header byte 0
      copy[8] = copy[8] & ~0x0c;
      chunks.push(copy);
    } else {
      chunks.push(buf.subarray(pos, sliceEnd));
    }

    pos += totalSize;
  }

  if (chunks.length === 0) return null;

  const body = Buffer.concat(chunks);
  const header = Buffer.alloc(12);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(4 + body.length, 4);
  header.write('WEBP', 8, 'ascii');

  return { buffer: Buffer.concat([header, body]), stripped };
}

export function validateAndSanitizeImage(
  buffer: Buffer,
  declaredMimeType?: string
): SanitizedImageResult {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: 'Image file is empty.' };
  }
  if (buffer.length > MAX_UPLOAD_FILE_BYTES) {
    return { valid: false, error: 'Image file exceeds the 5 MB limit.' };
  }

  const normalizedDeclared = (declaredMimeType || '').trim().toLowerCase();
  const normalizedMime = normalizedDeclared === 'image/jpg' ? 'image/jpeg' : normalizedDeclared;

  if (
    normalizedMime &&
    !ALLOWED_IMAGE_MIME_TYPES.includes(normalizedMime as AllowedImageMimeType)
  ) {
    return { valid: false, error: 'Only JPEG, PNG, and WebP images are supported.' };
  }

  const detected = detectImageMimeFromMagicBytes(buffer);
  if (!detected) {
    return { valid: false, error: 'File contents do not match a supported image format.' };
  }

  if (normalizedMime && normalizedMime !== detected) {
    return { valid: false, error: 'Image MIME type does not match file signature.' };
  }

  if (detected === 'image/jpeg') {
    const stripped = stripJpegMetadata(buffer);
    if (!stripped) return { valid: false, error: 'Malformed JPEG image.' };
    return {
      valid: true,
      mimeType: 'image/jpeg',
      ext: 'jpg',
      buffer: stripped.buffer,
      metadataStripped: stripped.stripped,
    };
  }

  if (detected === 'image/png') {
    const stripped = stripPngMetadata(buffer);
    if (!stripped) return { valid: false, error: 'Malformed PNG image.' };
    return {
      valid: true,
      mimeType: 'image/png',
      ext: 'png',
      buffer: stripped.buffer,
      metadataStripped: stripped.stripped,
    };
  }

  const stripped = stripWebpMetadata(buffer);
  if (!stripped) return { valid: false, error: 'Malformed WebP image.' };
  return {
    valid: true,
    mimeType: 'image/webp',
    ext: 'webp',
    buffer: stripped.buffer,
    metadataStripped: stripped.stripped,
  };
}

const SAFE_PHOTO_PATH_REGEX = /^[0-9a-f-]+\/[0-9a-f-]+\/[0-9a-f-]+\.(?:jpg|png|webp)$/i;

export function isValidReportPhotoPath(pathValue: string, expectedCollegeId?: string): boolean {
  if (!pathValue || typeof pathValue !== 'string') return false;
  if (pathValue.includes('..') || !SAFE_PHOTO_PATH_REGEX.test(pathValue)) {
    return false;
  }
  if (expectedCollegeId && !pathValue.startsWith(`${expectedCollegeId}/`)) {
    return false;
  }
  return true;
}

export function isSafeDisplayImageUrl(urlValue: string): boolean {
  if (!urlValue || typeof urlValue !== 'string') return false;
  if (urlValue.startsWith('/api/uploads/file?')) return true;
  if (urlValue.startsWith('blob:')) return true;
  try {
    const parsed = new URL(urlValue);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

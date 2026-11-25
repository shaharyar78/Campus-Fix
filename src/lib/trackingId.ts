/** Creates a college-prefixed tracking code, for example CF-202611-A8F9 or KCC-202611-A8F9. */
export function generateTrackingId(collegeSlug = 'cf'): string {
  const cleanedPrefix = collegeSlug.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 16);
  const prefix = cleanedPrefix.length >= 2 ? cleanedPrefix : 'CF';
  const date = new Date();
  const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const randomChars = randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${yearMonth}-${randomChars}`;
}

export function isValidTrackingId(trackingId: string): boolean {
  if (!trackingId || typeof trackingId !== 'string') return false;
  return /^[A-Z0-9]{2,16}-\d{6}-[A-Z0-9]{4,8}$/i.test(trackingId.trim());
}
import { randomBytes } from 'node:crypto';

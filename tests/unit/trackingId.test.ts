import { describe, it, expect } from 'vitest';
import { generateTrackingId, isValidTrackingId } from '../../src/lib/trackingId';

describe('Tracking ID', () => {
  it('generates IDs with CF-YYYYMM-8-hex-character format', () => {
    const id = generateTrackingId();
    expect(id).toMatch(/^CF-\d{6}-[A-F0-9]{8}$/);
    expect(isValidTrackingId(id)).toBe(true);
  });

  it('rejects malformed tracking IDs', () => {
    expect(isValidTrackingId('')).toBe(false);
    expect(isValidTrackingId('12345')).toBe(false);
    expect(isValidTrackingId('CF-ABC')).toBe(false);
  });
});

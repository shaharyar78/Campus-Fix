import { describe, it, expect } from 'vitest';
import { generateTrackingId, isValidTrackingId } from '../../src/lib/trackingId';

describe('Tracking ID', () => {
  it('generates IDs with CF-YYYYMM-XXXX format', () => {
    const id = generateTrackingId();
    expect(id).toMatch(/^CF-\d{6}-[A-Z0-9]{4}$/);
    expect(isValidTrackingId(id)).toBe(true);
  });

  it('rejects malformed tracking IDs', () => {
    expect(isValidTrackingId('')).toBe(false);
    expect(isValidTrackingId('12345')).toBe(false);
    expect(isValidTrackingId('CF-ABC')).toBe(false);
  });
});

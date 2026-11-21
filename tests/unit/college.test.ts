import { describe, it, expect } from 'vitest';
import { getCollegeBySlug, formatCollegeName } from '../../src/lib/college';

describe('College Utilities', () => {
  it('retrieves college by slug case-insensitively', () => {
    const colleges = [{ id: 'glbitm-id', name: 'G. L. Bajaj Institute of Technology & Management', slug: 'glbitm', address: null, is_active: true, created_at: '', updated_at: '' }];
    const col = getCollegeBySlug('GLBITM', colleges);
    expect(col).toBeDefined();
    expect(col?.name).toContain('Bajaj');

    expect(getCollegeBySlug('nit-campus', colleges)).toBeUndefined();
  });

  it('formats college name safely', () => {
    expect(formatCollegeName(null)).toBe('Your campus');
    expect(formatCollegeName({ id: 'kcc-id', name: 'KCC Institute', slug: 'kcc', address: null, is_active: true, created_at: '', updated_at: '' })).toBe('KCC Institute');
  });
});

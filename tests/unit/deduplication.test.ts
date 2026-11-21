import { describe, it, expect } from 'vitest';
import { findPotentialDuplicates } from '../../src/lib/deduplication';
import { Report } from '../../src/types';

describe('Deduplication', () => {
  const existingReports: Report[] = [
    {
      id: 'r-1',
      college_id: 'col-1',
      submitter_id: 'user-1',
      building_id: 'bld-1',
      tracking_id: 'CF-202611-AAAA',
      title: 'Water tap leaking heavily in 2nd floor washroom',
      description: 'The tap is leaking clean water constantly.',
      category: 'plumbing',
      floor: '2nd Floor',
      room: 'Washroom 2',
      status: 'submitted',
      upvote_count: 5,
      photo_paths: [],
      assigned_to: null,
      resolved_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  it('detects duplicate report in same building, floor, room and category', () => {
    const result = findPotentialDuplicates(
      {
        title: 'Leaking water tap in washroom',
        description: 'Water leaking on floor',
        category: 'plumbing',
        building_id: 'bld-1',
        floor: '2nd Floor',
        room: 'Washroom 2',
      },
      existingReports
    );

    expect(result.isDuplicate).toBe(true);
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].id).toBe('r-1');
  });

  it('does not flag distinct reports in different buildings', () => {
    const result = findPotentialDuplicates(
      {
        title: 'Broken chair',
        description: 'Chair leg snapped',
        category: 'furniture',
        building_id: 'bld-2',
        floor: '1st Floor',
      },
      existingReports
    );

    expect(result.isDuplicate).toBe(false);
    expect(result.matches.length).toBe(0);
  });
});

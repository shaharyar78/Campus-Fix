import { describe, it, expect } from 'vitest';
import { resolveQrLocation } from '../../src/lib/qrLocation';
import { Building } from '../../src/types';

const sampleBuildings: Building[] = [
  {
    id: 'bld-a',
    college_id: 'col-1',
    name: 'KCC Block A',
    code: 'KCC-A',
    floor_count: 5,
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'bld-b',
    college_id: 'col-1',
    name: 'Science Center',
    code: 'SCI',
    floor_count: 3,
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
];

describe('QR Location Resolution', () => {
  it('resolves a CampusFix URL QR tag into building, floor, section, and room', () => {
    const result = resolveQrLocation(
      'https://campusfix.app/report/new?building=KCC-A&floor=2&room=Lab+204&section=a2',
      sampleBuildings,
      'kcc'
    );

    expect(result.error).toBeNull();
    expect(result.location).toMatchObject({
      building_id: 'bld-a',
      building_label: 'KCC Block A',
      floor: '2nd Floor',
      room: 'Lab 204',
      section: 'A2',
    });
  });

  it('resolves JSON QR payloads by building code and room', () => {
    const result = resolveQrLocation(
      JSON.stringify({ code: 'SCI', floor: 'ground', room: 'Auditorium 101' }),
      sampleBuildings,
      'other-college'
    );

    expect(result.error).toBeNull();
    expect(result.location).toMatchObject({
      building_id: 'bld-b',
      building_label: 'Science Center',
      floor: 'Ground Floor',
      room: 'Auditorium 101',
    });
  });

  it('resolves CAMPUSFIX pipe-delimited and slash-delimited shorthand tags', () => {
    const pipeResult = resolveQrLocation('CAMPUSFIX:KCC-A|3|Seminar 301|A3', sampleBuildings, 'kcc');
    expect(pipeResult.error).toBeNull();
    expect(pipeResult.location).toMatchObject({
      building_id: 'bld-a',
      floor: '3rd Floor',
      room: 'Seminar 301',
      section: 'A3',
    });

    const slashResult = resolveQrLocation('SCI / Chem Lab 202', sampleBuildings, 'other');
    expect(slashResult.error).toBeNull();
    expect(slashResult.location).toMatchObject({
      building_id: 'bld-b',
      room: 'Chem Lab 202',
    });
  });

  it('supports room-only tags and custom-building campuses', () => {
    const roomOnly = resolveQrLocation('Lab 304', sampleBuildings, 'kcc');
    expect(roomOnly.error).toBeNull();
    expect(roomOnly.location?.room).toBe('Lab 304');

    const customCampus = resolveQrLocation(
      JSON.stringify({ building: 'Engineering Annex', floor: '1st Floor', room: 'Room 105' }),
      [],
      'glbitm'
    );
    expect(customCampus.error).toBeNull();
    expect(customCampus.location).toMatchObject({
      building_label: 'Engineering Annex',
      floor: '1st Floor',
      room: 'Room 105',
    });
  });

  it('returns an error when an unknown building code is scanned against a configured directory', () => {
    const result = resolveQrLocation('UNKNOWN-BLOCK-99', sampleBuildings, 'kcc');
    expect(result.location).toBeNull();
    expect(result.error).toContain('not found');
  });
});

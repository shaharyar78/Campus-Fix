import { FLOORS, KCC_BLOCKS, KCC_SECTIONS } from '@/lib/constants';
import { Building } from '@/types';

export interface ResolvedQrLocation {
  building_id?: string;
  building_label?: string;
  floor?: string;
  room?: string;
  section?: string;
  summary: string;
}

export interface QrResolutionResult {
  location: ResolvedQrLocation | null;
  error: string | null;
}

interface RawLocationFields {
  building_id?: string;
  building?: string;
  code?: string;
  floor?: string;
  room?: string;
  section?: string;
}

function normalizeCode(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getOrdinalFloorLabel(floorNumber: number): string {
  if (floorNumber === 0) return 'Ground Floor';
  const mod100 = floorNumber % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${floorNumber}th Floor`;
  const mod10 = floorNumber % 10;
  if (mod10 === 1) return `${floorNumber}st Floor`;
  if (mod10 === 2) return `${floorNumber}nd Floor`;
  if (mod10 === 3) return `${floorNumber}rd Floor`;
  return `${floorNumber}th Floor`;
}

export function getFloorOptionsForBuilding(building?: Building | null): string[] {
  if (!building) return FLOORS;
  return [
    'Ground Floor',
    ...Array.from(
      { length: Math.max(0, building.floor_count - 1) },
      (_, index) => getOrdinalFloorLabel(index + 1)
    ),
  ];
}

export function normalizeFloorValue(rawFloor: string, availableFloors: string[]): string | undefined {
  const cleaned = rawFloor.trim();
  if (!cleaned) return undefined;
  const lower = cleaned.toLowerCase();

  const exact = availableFloors.find((f) => f.toLowerCase() === lower);
  if (exact) return exact;

  if (/^(0|g|gf|ground(\s+floor)?)$/.test(lower)) {
    return availableFloors.find((f) => f === 'Ground Floor');
  }

  if (/^(b|bm|basement)$/.test(lower)) {
    return availableFloors.find((f) => f === 'Basement');
  }

  if (/^(terrace|roof|terrace\s*\/\s*roof)$/.test(lower)) {
    return availableFloors.find((f) => f === 'Terrace / Roof');
  }

  const wordMap: Record<string, number> = {
    first: 1,
    second: 2,
    third: 3,
    fourth: 4,
    fifth: 5,
    sixth: 6,
    seventh: 7,
    eighth: 8,
    ninth: 9,
    tenth: 10,
  };

  let floorNum: number | null = null;
  if (wordMap[lower]) {
    floorNum = wordMap[lower];
  } else {
    const numMatch = lower.match(/^(?:floor\s*)?(\d{1,2})(?:st|nd|rd|th)?(?:\s*floor)?$/);
    if (numMatch) {
      floorNum = Number(numMatch[1]);
    }
  }

  if (floorNum !== null) {
    const candidate = getOrdinalFloorLabel(floorNum);
    return availableFloors.find((f) => f.toLowerCase() === candidate.toLowerCase());
  }

  return undefined;
}

function normalizeSectionValue(rawSection: string): string | undefined {
  const trimmed = rawSection.trim().toUpperCase();
  if (!trimmed) return undefined;
  return KCC_SECTIONS.find((s) => s.toUpperCase() === trimmed);
}

function parseUrlParams(params: URLSearchParams): RawLocationFields {
  const buildingId = params.get('building_id') || params.get('buildingId') || undefined;
  const building =
    params.get('building_label') ||
    params.get('building') ||
    params.get('block') ||
    undefined;
  const code = params.get('code') || params.get('building_code') || undefined;
  const floor = params.get('floor') || undefined;
  const room = params.get('room') || params.get('spot') || params.get('location') || undefined;
  const section = params.get('section') || undefined;

  return { building_id: buildingId, building, code, floor, room, section };
}

function parseRawQrPayload(rawText: string): RawLocationFields | null {
  const text = rawText.trim();
  if (!text) return null;

  // 1. URL format (full URL, custom scheme, or relative path with query string)
  if (/^(https?:\/\/|campusfix:\/\/|\/)/i.test(text) && text.includes('?')) {
    try {
      const normalized = text.startsWith('/') ? `https://campusfix.local${text}` : text;
      const url = new URL(normalized);
      const fields = parseUrlParams(url.searchParams);
      if (fields.building_id || fields.building || fields.code || fields.floor || fields.room || fields.section) {
        return fields;
      }
    } catch {
      // Fall through to other parsers
    }
  }

  // 2. JSON object payload
  if (text.startsWith('{') && text.endsWith('}')) {
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const readStr = (...keys: string[]) => {
          for (const key of keys) {
            const val = parsed[key];
            if (typeof val === 'string' && val.trim()) return val.trim();
            if (typeof val === 'number') return String(val);
          }
          return undefined;
        };
        const fields: RawLocationFields = {
          building_id: readStr('building_id', 'buildingId'),
          building: readStr('building', 'building_name', 'buildingName', 'building_label', 'block'),
          code: readStr('code', 'building_code', 'buildingCode'),
          floor: readStr('floor', 'floor_level', 'level'),
          room: readStr('room', 'spot', 'area'),
          section: readStr('section'),
        };
        if (fields.building_id || fields.building || fields.code || fields.floor || fields.room || fields.section) {
          return fields;
        }
      }
    } catch {
      return null;
    }
  }

  // 3. Prefixed pipe format e.g. CAMPUSFIX:KCC-A|2nd Floor|Lab 204|A2
  const prefixMatch = text.match(/^(?:campusfix|cf|cf-tag):(.*)$/i);
  const body = prefixMatch ? prefixMatch[1].trim() : text;

  // Check key=value or key:value pairs separated by ; | & or newline
  if (/[;|&\n]/.test(body) && /(?:building|building_id|code|floor|room|section|block)\s*[=:]/i.test(body)) {
    const fields: RawLocationFields = {};
    const parts = body.split(/[;|&\n]+/);
    for (const part of parts) {
      const eqIdx = part.search(/[=:]/);
      if (eqIdx <= 0) continue;
      const key = part.slice(0, eqIdx).trim().toLowerCase();
      const val = part.slice(eqIdx + 1).trim();
      if (!val) continue;
      if (key === 'building_id' || key === 'buildingid') fields.building_id = val;
      else if (key === 'building' || key === 'building_label' || key === 'block') fields.building = val;
      else if (key === 'code' || key === 'building_code') fields.code = val;
      else if (key === 'floor' || key === 'level') fields.floor = val;
      else if (key === 'room' || key === 'spot' || key === 'area') fields.room = val;
      else if (key === 'section') fields.section = val;
    }
    if (fields.building_id || fields.building || fields.code || fields.floor || fields.room || fields.section) {
      return fields;
    }
  }

  // Single key=value or query string without path
  if (/^(?:building|building_id|code|floor|room|section)=/i.test(body)) {
    const fields = parseUrlParams(new URLSearchParams(body));
    if (fields.building_id || fields.building || fields.code || fields.floor || fields.room || fields.section) {
      return fields;
    }
  }

  // Pipe-delimited positional CAMPUSFIX:CODE|FLOOR|ROOM|SECTION
  if (prefixMatch && body.includes('|')) {
    const [b, fl, rm, sec] = body.split('|').map((s) => s.trim());
    return {
      building: b || undefined,
      floor: fl || undefined,
      room: rm || undefined,
      section: sec || undefined,
    };
  }

  // 4. Slash or " - " separated shorthand like "KCC-A / Lab 204" or "KCC Block A - 2nd Floor - Lab 204"
  if (/\s+(?:\/|-|\|)\s+/.test(body)) {
    const segments = body.split(/\s+(?:\/|-|\|)\s+/).map((s) => s.trim()).filter(Boolean);
    if (segments.length >= 2) {
      const [first, second, third] = segments;
      if (third) {
        return { building: first, floor: second, room: third };
      }
      return { building: first, room: second };
    }
  }

  // 5. Plain room-only label e.g. "Lab 304", "Room 102", "Boys Washroom"
  if (/^(?:room|lab|hall|classroom|washroom|restroom|office|corridor|stairs|lobby|canteen|library)\b/i.test(body)) {
    return { room: body };
  }

  // 6. Plain building code or name (reject obvious URLs or multi-sentence text)
  if (!/^https?:\/\//i.test(body) && body.length <= 80) {
    return { building: body };
  }

  return null;
}

function matchBuilding(
  fields: RawLocationFields,
  buildings: Building[],
  collegeSlug?: string
): { buildingId?: string; buildingLabel?: string; matchedDirectoryBuilding?: Building | null } {
  const isKcc = collegeSlug === 'kcc';
  const candidateTokens = [fields.building_id, fields.code, fields.building].filter(
    (v): v is string => Boolean(v && v.trim())
  );

  for (const token of candidateTokens) {
    const trimmed = token.trim();
    const byId = buildings.find((b) => b.id.toLowerCase() === trimmed.toLowerCase());
    if (byId) {
      return { buildingId: byId.id, buildingLabel: byId.name, matchedDirectoryBuilding: byId };
    }
  }

  for (const token of candidateTokens) {
    const trimmed = token.trim();
    const norm = normalizeCode(trimmed);
    const byCode = buildings.find((b) => b.code && normalizeCode(b.code) === norm);
    if (byCode) {
      return { buildingId: byCode.id, buildingLabel: byCode.name, matchedDirectoryBuilding: byCode };
    }
    const byName = buildings.find(
      (b) => b.name.trim().toLowerCase() === trimmed.toLowerCase() || normalizeCode(b.name) === norm
    );
    if (byName) {
      return { buildingId: byName.id, buildingLabel: byName.name, matchedDirectoryBuilding: byName };
    }
  }

  if (isKcc) {
    for (const token of candidateTokens) {
      const trimmed = token.trim();
      const norm = normalizeCode(trimmed);
      const kccBlock = KCC_BLOCKS.find(
        (b) =>
          b.id.toLowerCase() === trimmed.toLowerCase() ||
          normalizeCode(b.code) === norm ||
          normalizeCode(b.name) === norm
      );
      if (kccBlock) {
        const syncedBuilding = buildings.find(
          (b) =>
            (b.code && normalizeCode(b.code) === normalizeCode(kccBlock.code)) ||
            b.name.trim().toLowerCase() === kccBlock.name.toLowerCase()
        );
        return {
          buildingId: syncedBuilding?.id || kccBlock.id,
          buildingLabel: syncedBuilding?.name || kccBlock.name,
          matchedDirectoryBuilding: syncedBuilding || null,
        };
      }
    }
  }

  return {};
}

export function resolveQrLocation(
  rawText: string,
  buildings: Building[],
  collegeSlug?: string
): QrResolutionResult {
  const fields = parseRawQrPayload(rawText);
  if (!fields) {
    return {
      location: null,
      error: 'Scanned QR code does not contain valid CampusFix building or room information.',
    };
  }

  const usesCustomBuilding = Boolean(collegeSlug) && collegeSlug !== 'kcc' && buildings.length === 0;
  const matched = matchBuilding(fields, buildings, collegeSlug);

  const building_id = matched.buildingId;
  let building_label = matched.buildingLabel;

  if (!building_id && usesCustomBuilding && (fields.building || fields.code)) {
    building_label = (fields.building || fields.code || '').trim();
  }

  // If the tag explicitly asked for a building that isn't in this campus directory and has no room, reject cleanly
  const requestedBuildingText = fields.building || fields.code || fields.building_id;
  if (requestedBuildingText && !building_id && !building_label && !fields.room) {
    return {
      location: null,
      error: `Building "${requestedBuildingText}" was not found in your campus directory.`,
    };
  }

  const availableFloors = getFloorOptionsForBuilding(matched.matchedDirectoryBuilding);
  const floor = fields.floor ? normalizeFloorValue(fields.floor, availableFloors) : undefined;
  const section = fields.section ? normalizeSectionValue(fields.section) : undefined;
  const room = fields.room?.trim() || undefined;

  if (!building_id && !building_label && !room && !floor) {
    return {
      location: null,
      error: 'No matching building or room details found in this QR code.',
    };
  }

  const summaryParts = [
    building_label,
    floor,
    section ? `Section ${section}` : undefined,
    room,
  ].filter((part): part is string => Boolean(part));

  return {
    location: {
      building_id,
      building_label,
      floor,
      room,
      section,
      summary: summaryParts.join(' \u2022 ') || 'Location linked from QR tag',
    },
    error: null,
  };
}

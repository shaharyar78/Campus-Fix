import { Report } from '@/types';

export interface DuplicateMatchResult {
  isDuplicate: boolean;
  confidence: 'high' | 'medium' | 'low';
  matches: Report[];
}

/**
 * Checks a draft report against a list of active reports in the same college/building.
 * Triggers duplicate warning if:
 * 1. Same building, same floor/room and same category
 * 2. High keyword similarity in title
 */
export function findPotentialDuplicates(
  draft: {
    title: string;
    description: string;
    category: string;
    building_id?: string | null;
    building_label?: string | null;
    floor?: string | null;
    room?: string | null;
  },
  existingReports: Report[]
): DuplicateMatchResult {
  if (!draft.title || existingReports.length === 0) {
    return { isDuplicate: false, confidence: 'low', matches: [] };
  }

  // Filter only active reports (not resolved, rejected or closed)
  const activeReports = existingReports.filter(
    (r) => !['resolved', 'rejected', 'closed'].includes(r.status)
  );

  const matched: { report: Report; score: number }[] = [];

  const draftTitleWords = extractKeywords(draft.title);

  for (const report of activeReports) {
    let score = 0;

    // Check category match
    if (report.category === draft.category) {
      score += 2;
    }

    // Match a selected building ID or a free-text building name while a campus directory is unavailable.
    const draftBuildingLabel = draft.building_label?.trim().toLowerCase();
    const reportBuildingLabel = report.building_label?.trim().toLowerCase();
    const sameBuilding = Boolean(
      (draft.building_id && report.building_id === draft.building_id) ||
      (draftBuildingLabel && reportBuildingLabel && draftBuildingLabel === reportBuildingLabel)
    );
    if (sameBuilding) {
      score += 3;

      // Check floor match
      if (draft.floor && report.floor && draft.floor.toLowerCase() === report.floor.toLowerCase()) {
        score += 2;
      }

      // Check room match
      if (draft.room && report.room && draft.room.toLowerCase().trim() === report.room.toLowerCase().trim()) {
        score += 3;
      }
    }

    // Check title word overlap
    const reportTitleWords = extractKeywords(report.title);
    const commonWords = draftTitleWords.filter((w) => reportTitleWords.includes(w));
    if (commonWords.length > 0) {
      score += commonWords.length * 2;
    }

    // If score >= 5, consider it a potential duplicate
    if (score >= 5) {
      matched.push({ report, score });
    }
  }

  matched.sort((a, b) => b.score - a.score);

  const matches = matched.map((m) => m.report);

  if (matches.length > 0) {
    const highestScore = matched[0].score;
    const confidence = highestScore >= 8 ? 'high' : highestScore >= 6 ? 'medium' : 'low';
    return {
      isDuplicate: true,
      confidence,
      matches,
    };
  }

  return {
    isDuplicate: false,
    confidence: 'low',
    matches: [],
  };
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'in', 'of', 'to', 'for', 'with', 'not',
    'this', 'that', 'it', 'my', 'room', 'floor', 'campus', 'college', 'problem', 'broken', 'issue'
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));
}

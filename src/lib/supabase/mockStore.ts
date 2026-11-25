import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import type { Building, ChatMessage, College, Report, ReportUpdate, UserProfile } from '@/types';
import { validatePassword } from '@/lib/validators';
import { KCC_SECTIONS } from '@/lib/constants';
import { MOCK_SESSION_COOKIE } from './mockCookies';

export { MOCK_SESSION_COOKIE };

export interface MockAuthUser {
  id: string;
  email: string;
  passwordHash: string;
  email_confirmed?: boolean;
  user_metadata?: Record<string, unknown>;
}

export interface MockUploadEntry {
  buffer: Buffer;
  mimeType: string;
  collegeId: string;
  userId: string;
}

export interface MockUpvote {
  report_id: string;
  user_id: string;
  created_at: string;
}

export interface MockStore {
  colleges: College[];
  buildings: Building[];
  profiles: UserProfile[];
  users: MockAuthUser[];
  reports: Report[];
  report_updates: ReportUpdate[];
  report_upvotes: MockUpvote[];
  messages: ChatMessage[];
  reset_requests: Record<string, number[]>;
  uploads: Record<string, MockUploadEntry>;
}

export type FilterOp =
  | { type: 'eq'; column: string; value: unknown }
  | { type: 'in'; column: string; values: unknown[] }
  | { type: 'ilike'; column: string; pattern: string }
  | { type: 'is'; column: string; value: null | boolean }
  | { type: 'match'; criteria: Record<string, unknown> };

export interface MockQueryPayload {
  table: string;
  action: 'select' | 'insert' | 'update' | 'delete';
  columns?: string;
  filters?: FilterOp[];
  order?: { column: string; ascending: boolean } | null;
  limit?: number | null;
  range?: { from: number; to: number } | null;
  count?: 'exact' | null;
  single?: boolean;
  maybeSingle?: boolean;
  values?: unknown;
  returning?: boolean;
}

export function hashMockPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyMockPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, originalHex] = parts;
  if (!salt || !originalHex) return false;
  try {
    const derived = scryptSync(password, salt, 64);
    const original = Buffer.from(originalHex, 'hex');
    return derived.length === original.length && timingSafeEqual(derived, original);
  } catch {
    return false;
  }
}

const globalForMock = globalThis as unknown as {
  __campusfixMockStore?: MockStore;
};

function createInitialStore(): MockStore {
  const now = new Date().toISOString();
  const earlier = new Date(Date.now() - 86400_000 * 2).toISOString();
  const yesterday = new Date(Date.now() - 86400_000).toISOString();

  const kccId = '11111111-1111-4111-8111-111111111111';
  const glbitmId = '22222222-2222-4222-8222-222222222222';

  const blockAId = 'aaaa1111-1111-4111-8111-111111111111';
  const blockBId = 'bbbb2222-2222-4222-8222-222222222222';
  const blockCId = 'cccc3333-3333-4333-8333-333333333333';

  const studentId = '33333333-3333-4333-8333-333333333333';
  const adminId = '44444444-4444-4444-8444-444444444444';
  const superAdminId = '99999999-9999-4999-8999-999999999999';

  const report1Id = '55555555-5555-4555-8555-555555555551';
  const report2Id = '55555555-5555-4555-8555-555555555552';
  const report3Id = '55555555-5555-4555-8555-555555555553';

  return {
    colleges: [
      {
        id: kccId,
        name: 'KCC Institute',
        slug: 'kcc',
        email_domain: 'gmail.com',
        address: 'KCC Institute Campus',
        is_active: true,
        created_at: earlier,
        updated_at: earlier,
      },
      {
        id: glbitmId,
        name: 'G. L. Bajaj Institute of Technology & Management',
        slug: 'glbitm',
        email_domain: 'glbitm.ac.in,glbitm.org',
        address: 'Plot No. 2, APJ Abdul Kalam Road, Knowledge Park III, Greater Noida, Uttar Pradesh 201306',
        is_active: true,
        created_at: earlier,
        updated_at: earlier,
      },
    ],
    buildings: [
      {
        id: blockAId,
        college_id: kccId,
        name: 'KCC Block A',
        code: 'KCC-A',
        floor_count: 5,
        sections: [...KCC_SECTIONS],
        is_active: true,
        created_at: earlier,
        updated_at: earlier,
      },
      {
        id: blockBId,
        college_id: kccId,
        name: 'KCC Block B',
        code: 'KCC-B',
        floor_count: 5,
        sections: [...KCC_SECTIONS],
        is_active: true,
        created_at: earlier,
        updated_at: earlier,
      },
      {
        id: blockCId,
        college_id: kccId,
        name: 'KCC Block C',
        code: 'KCC-C',
        floor_count: 5,
        sections: [...KCC_SECTIONS],
        is_active: true,
        created_at: earlier,
        updated_at: earlier,
      },
      {
        id: 'eeee1111-1111-4111-8111-111111111111',
        college_id: glbitmId,
        name: 'GL Bajaj Block 1 (Main Engineering)',
        code: 'GLB-1',
        floor_count: 5,
        sections: [],
        is_active: true,
        created_at: earlier,
        updated_at: earlier,
      },
      {
        id: 'eeee2222-2222-4222-8222-222222222222',
        college_id: glbitmId,
        name: 'GL Bajaj Block 2 (Management & IT)',
        code: 'GLB-2',
        floor_count: 4,
        sections: [],
        is_active: true,
        created_at: earlier,
        updated_at: earlier,
      },
      {
        id: 'eeee3333-3333-4333-8333-333333333333',
        college_id: glbitmId,
        name: 'GL Bajaj Central Library & Auditorium',
        code: 'GLB-LIB',
        floor_count: 3,
        sections: [],
        is_active: true,
        created_at: earlier,
        updated_at: earlier,
      },
    ],
    profiles: [
      {
        id: studentId,
        college_id: kccId,
        role: 'student',
        full_name: 'Aarav Sharma',
        username: null,
        email: 'aarav.sharma@gmail.com',
        avatar_url: null,
        approval_status: 'approved',
        approval_requested_role: 'student',
        approved_by: adminId,
        approved_at: earlier,
        created_at: earlier,
        updated_at: earlier,
      },
      {
        id: adminId,
        college_id: kccId,
        role: 'admin',
        full_name: 'Campus Facilities Desk',
        username: null,
        email: 'facilities.kcc@gmail.com',
        avatar_url: null,
        approval_status: 'approved',
        approval_requested_role: 'admin',
        approved_by: superAdminId,
        approved_at: earlier,
        created_at: earlier,
        updated_at: earlier,
      },
      {
        id: superAdminId,
        college_id: null,
        role: 'super_admin',
        full_name: 'Platform Super Admin',
        username: 'superadmin',
        email: 'superadmin@campusfix.edu',
        avatar_url: null,
        approval_status: 'approved',
        approval_requested_role: 'admin',
        approved_by: null,
        approved_at: earlier,
        created_at: earlier,
        updated_at: earlier,
      },
    ],
    users: [
      {
        id: studentId,
        email: 'aarav.sharma@gmail.com',
        passwordHash: hashMockPassword('student123'),
        user_metadata: {
          full_name: 'Aarav Sharma',
          role: 'student',
          college_id: kccId,
        },
      },
      {
        id: adminId,
        email: 'facilities.kcc@gmail.com',
        passwordHash: hashMockPassword('admin123'),
        user_metadata: {
          full_name: 'Campus Facilities Desk',
          role: 'admin',
          college_id: kccId,
        },
      },
      {
        id: superAdminId,
        email: 'superadmin@campusfix.edu',
        passwordHash: hashMockPassword('superadmin123'),
        user_metadata: {
          full_name: 'Platform Super Admin',
          role: 'super_admin',
          college_id: null,
        },
      },
    ],
    reports: [
      {
        id: report1Id,
        college_id: kccId,
        submitter_id: studentId,
        building_id: blockAId,
        building_label: 'KCC Block A',
        tracking_id: 'CF-KCC-2026-101',
        title: 'Flickering corridor lights on 2nd floor',
        description: 'Two ceiling tube lights near Lab 204 flicker continuously during afternoon classes.',
        category: 'electrical',
        floor: '2nd Floor',
        room: 'Corridor near Lab 204',
        section: 'A2',
        situation: 'medium',
        status: 'in_progress',
        upvote_count: 6,
        photo_paths: [],
        assigned_to: adminId,
        resolved_at: null,
        created_at: earlier,
        updated_at: yesterday,
      },
      {
        id: report2Id,
        college_id: kccId,
        submitter_id: studentId,
        building_id: blockBId,
        building_label: 'KCC Block B',
        tracking_id: 'CF-KCC-2026-102',
        title: 'Drinking water cooler tap leaking',
        description: 'The cold-water tap on the ground floor water station is dripping steadily and creating puddles.',
        category: 'plumbing',
        floor: 'Ground Floor',
        room: 'Main Lobby Water Station',
        section: 'B1',
        situation: 'high',
        status: 'assigned',
        upvote_count: 9,
        photo_paths: [],
        assigned_to: adminId,
        resolved_at: null,
        created_at: yesterday,
        updated_at: yesterday,
      },
      {
        id: report3Id,
        college_id: kccId,
        submitter_id: studentId,
        building_id: blockCId,
        building_label: 'KCC Block C',
        tracking_id: 'CF-KCC-2026-103',
        title: 'Wi-Fi access point offline in seminar hall',
        description: 'Students in the 3rd floor seminar room cannot connect to campus Wi-Fi; the wall AP LED is off.',
        category: 'internet',
        floor: '3rd Floor',
        room: 'Seminar Hall 301',
        section: 'B3',
        situation: 'normal',
        status: 'resolved',
        upvote_count: 4,
        photo_paths: [],
        assigned_to: adminId,
        resolved_at: now,
        created_at: earlier,
        updated_at: now,
      },
    ],
    report_updates: [
      {
        id: '66666666-6666-4666-8666-666666666661',
        report_id: report1Id,
        author_id: adminId,
        status: 'in_progress',
        message: 'Electrician scheduled to replace ballast and tube fixtures today.',
        created_at: yesterday,
      },
      {
        id: '66666666-6666-4666-8666-666666666662',
        report_id: report3Id,
        author_id: adminId,
        status: 'resolved',
        message: 'PoE switch port reset and access point restored to service.',
        created_at: now,
      },
    ],
    report_upvotes: [],
    messages: [
      {
        id: '77777777-7777-4777-8777-777777777771',
        college_id: kccId,
        report_id: null,
        sender_id: adminId,
        body: 'Welcome to KCC Campus Support. Share ticket IDs or facility questions here.',
        created_at: yesterday,
      },
    ],
    reset_requests: {},
    uploads: {},
  };
}

export function getMockStore(): MockStore {
  if (!globalForMock.__campusfixMockStore) {
    globalForMock.__campusfixMockStore = createInitialStore();
  }
  return globalForMock.__campusfixMockStore;
}

export function resetMockStore(): MockStore {
  globalForMock.__campusfixMockStore = createInitialStore();
  return globalForMock.__campusfixMockStore;
}

export function getMockAuthUser(userId: string) {
  const store = getMockStore();
  const profile = store.profiles.find((p) => p.id === userId);
  if (!profile) return null;
  return {
    id: profile.id,
    email: profile.email || undefined,
    user_metadata: {
      full_name: profile.full_name,
      role: profile.role,
      college_id: profile.college_id,
    },
  };
}

export function authenticateMockUser(email: string, password: string) {
  const store = getMockStore();
  const normalized = email.trim().toLowerCase();
  const account = store.users.find((u) => u.email.toLowerCase() === normalized);
  if (!account || !verifyMockPassword(password, account.passwordHash)) {
    return { user: null, error: { message: 'Invalid login credentials' } };
  }
  if (account.email_confirmed === false) {
    return { user: null, error: { message: 'Email not confirmed' } };
  }
  const profile = store.profiles.find((p) => p.id === account.id);
  const user = {
    id: account.id,
    email: account.email,
    user_metadata: profile
      ? {
          full_name: profile.full_name,
          role: profile.role,
          college_id: profile.college_id,
        }
      : account.user_metadata,
  };
  return { user, error: null };
}

export function mockResetPasswordForEmail(
  email: string,
  now = Date.now()
): { data: Record<string, unknown> | null; error: { message: string; status: number } | null } {
  const normalized = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return {
      data: null,
      error: { message: 'Enter a valid email address.', status: 400 },
    };
  }

  const store = getMockStore();
  if (!store.reset_requests) {
    store.reset_requests = {};
  }
  const windowStart = now - 60_000;
  const recent = (store.reset_requests[normalized] || []).filter((ts) => ts > windowStart);

  if (recent.length >= 3) {
    store.reset_requests[normalized] = recent;
    return {
      data: null,
      error: {
        message: 'For security purposes, you can only request this after 60 seconds.',
        status: 429,
      },
    };
  }

  store.reset_requests[normalized] = [...recent, now];
  return { data: {}, error: null };
}

export function mockUpdateUser(
  userId: string | null | undefined,
  attrs: { password?: string }
): {
  data: { user: ReturnType<typeof getMockAuthUser> };
  error: { message: string; status: number } | null;
} {
  if (!userId) {
    return { data: { user: null }, error: { message: 'Auth session missing!', status: 401 } };
  }
  const user = getMockAuthUser(userId);
  if (!user) {
    return { data: { user: null }, error: { message: 'Auth session missing!', status: 401 } };
  }
  const password = typeof attrs?.password === 'string' ? attrs.password : '';
  const passwordError = validatePassword(password);
  if (passwordError) {
    return { data: { user: null }, error: { message: passwordError, status: 422 } };
  }
  const store = getMockStore();
  const account = store.users.find((u) => u.id === user.id);
  if (account) {
    account.passwordHash = hashMockPassword(password);
  }
  return { data: { user }, error: null };
}

function getRowField(row: Record<string, unknown>, col: string): unknown {
  return row[col];
}

function matchesFilter(row: Record<string, unknown>, filter: FilterOp): boolean {
  switch (filter.type) {
    case 'eq':
      return getRowField(row, filter.column) === filter.value;
    case 'in':
      return filter.values.includes(getRowField(row, filter.column));
    case 'is':
      return getRowField(row, filter.column) === filter.value;
    case 'ilike': {
      const val = getRowField(row, filter.column);
      if (typeof val !== 'string') return false;
      const pattern = filter.pattern.toLowerCase();
      if (pattern.startsWith('%') && pattern.endsWith('%')) {
        return val.toLowerCase().includes(pattern.slice(1, -1));
      }
      if (pattern.startsWith('%')) {
        return val.toLowerCase().endsWith(pattern.slice(1));
      }
      if (pattern.endsWith('%')) {
        return val.toLowerCase().startsWith(pattern.slice(0, -1));
      }
      return val.toLowerCase() === pattern;
    }
    case 'match':
      return Object.entries(filter.criteria).every(([k, v]) => getRowField(row, k) === v);
    default:
      return true;
  }
}

function enrichRow(store: MockStore, table: string, row: Record<string, unknown>, columns?: string): Record<string, unknown> {
  const copy = { ...row };
  const cols = columns || '*';

  if (table === 'reports') {
    if (cols.includes('building:')) {
      const building = store.buildings.find((b) => b.id === copy.building_id) || null;
      copy.building = building ? { id: building.id, name: building.name, code: building.code } : null;
    }
    if (cols.includes('submitter:')) {
      const sub = store.profiles.find((p) => p.id === copy.submitter_id) || null;
      copy.submitter = sub ? { id: sub.id, full_name: sub.full_name, email: sub.email } : null;
    }
  } else if (table === 'report_updates') {
    if (cols.includes('author:')) {
      const author = store.profiles.find((p) => p.id === copy.author_id) || null;
      copy.author = author ? { full_name: author.full_name, role: author.role } : null;
    }
  } else if (table === 'messages') {
    if (cols.includes('sender:')) {
      const sender = store.profiles.find((p) => p.id === copy.sender_id) || null;
      copy.sender = sender
        ? { id: sender.id, full_name: sender.full_name, email: sender.email, role: sender.role }
        : null;
    }
  } else if (table === 'profiles') {
    if (cols.includes('college:')) {
      const college = store.colleges.find((c) => c.id === copy.college_id) || null;
      copy.college = college ? { name: college.name } : null;
    }
  }

  return copy;
}

function getTableCollection(store: MockStore, table: string): Record<string, unknown>[] | null {
  switch (table) {
    case 'colleges':
      return store.colleges as unknown as Record<string, unknown>[];
    case 'buildings':
      return store.buildings as unknown as Record<string, unknown>[];
    case 'profiles':
      return store.profiles as unknown as Record<string, unknown>[];
    case 'reports':
      return store.reports as unknown as Record<string, unknown>[];
    case 'report_updates':
      return store.report_updates as unknown as Record<string, unknown>[];
    case 'report_upvotes':
      return store.report_upvotes as unknown as Record<string, unknown>[];
    case 'messages':
      return store.messages as unknown as Record<string, unknown>[];
    default:
      return null;
  }
}

export function executeMockQuery(payload: MockQueryPayload): {
  data: unknown;
  error: { message: string; code?: string } | null;
  count?: number;
} {
  const store = getMockStore();
  const collection = getTableCollection(store, payload.table);
  if (!collection) {
    return { data: null, error: { message: `Table ${payload.table} not found` } };
  }

  const filters = payload.filters || [];

  if (payload.action === 'select') {
    let rows = collection.filter((row) => filters.every((f) => matchesFilter(row, f)));
    const totalCount = rows.length;

    if (payload.order) {
      const { column, ascending } = payload.order;
      rows = [...rows].sort((a, b) => {
        const av = a[column];
        const bv = b[column];
        if (typeof av === 'number' && typeof bv === 'number') {
          return ascending ? av - bv : bv - av;
        }
        return ascending ? String(av ?? '').localeCompare(String(bv ?? '')) : String(bv ?? '').localeCompare(String(av ?? ''));
      });
    }

    if (payload.range) {
      const from = Math.max(0, payload.range.from);
      const to = Math.max(from, payload.range.to);
      rows = rows.slice(from, to + 1);
    } else if (typeof payload.limit === 'number') {
      rows = rows.slice(0, payload.limit);
    }

    const enriched = rows.map((row) => enrichRow(store, payload.table, row, payload.columns));
    const countMeta = payload.count === 'exact' ? { count: totalCount } : {};

    if (payload.single) {
      if (enriched.length !== 1) {
        return { data: null, error: { message: 'Row not found', code: 'PGRST116' }, ...countMeta };
      }
      return { data: enriched[0], error: null, ...countMeta };
    }
    if (payload.maybeSingle) {
      return { data: enriched[0] ?? null, error: null, ...countMeta };
    }
    return { data: enriched, error: null, ...countMeta };
  }

  if (payload.action === 'insert') {
    const items = Array.isArray(payload.values) ? payload.values : [payload.values];
    const now = new Date().toISOString();
    const inserted: Record<string, unknown>[] = [];

    for (const raw of items) {
      if (!raw || typeof raw !== 'object') continue;
      const record = { ...(raw as Record<string, unknown>) };

      if (payload.table === 'colleges') {
        const slug = String(record.slug || '').toLowerCase();
        if (store.colleges.some((c) => c.slug.toLowerCase() === slug)) {
          return { data: null, error: { message: 'Duplicate college slug', code: '23505' } };
        }
      }

      if (payload.table !== 'report_upvotes' && !record.id) {
        record.id = randomUUID();
      }
      if (!record.created_at) record.created_at = now;
      if (payload.table !== 'report_updates' && payload.table !== 'report_upvotes' && payload.table !== 'messages' && !record.updated_at) {
        record.updated_at = now;
      }

      if (payload.table === 'report_upvotes') {
        const exists = store.report_upvotes.some(
          (u) => u.report_id === record.report_id && u.user_id === record.user_id
        );
        if (exists) {
          return { data: null, error: { message: 'Already upvoted', code: '23505' } };
        }
        const report = store.reports.find((r) => r.id === record.report_id);
        if (report) report.upvote_count += 1;
      }

      collection.push(record);
      inserted.push(enrichRow(store, payload.table, record, payload.columns));
    }

    if (payload.single) {
      return { data: inserted[0] ?? null, error: inserted[0] ? null : { message: 'Insert failed' } };
    }
    if (payload.maybeSingle) {
      return { data: inserted[0] ?? null, error: null };
    }
    return { data: inserted, error: null };
  }

  if (payload.action === 'update') {
    const patch = (payload.values || {}) as Record<string, unknown>;
    const now = new Date().toISOString();
    const updated: Record<string, unknown>[] = [];

    if (payload.table === 'colleges' && typeof patch.slug === 'string') {
      const slug = patch.slug.toLowerCase();
      const conflict = store.colleges.some(
        (c) => c.slug.toLowerCase() === slug && !filters.every((f) => matchesFilter(c as unknown as Record<string, unknown>, f))
      );
      if (conflict) {
        return { data: null, error: { message: 'Duplicate college slug', code: '23505' } };
      }
    }

    for (let i = 0; i < collection.length; i += 1) {
      const row = collection[i];
      if (filters.every((f) => matchesFilter(row, f))) {
        Object.assign(row, patch, { updated_at: now });
        updated.push(enrichRow(store, payload.table, row, payload.columns));
      }
    }

    if (payload.single) {
      if (updated.length !== 1) {
        return { data: null, error: { message: 'Row not found', code: 'PGRST116' } };
      }
      return { data: updated[0], error: null };
    }
    if (payload.maybeSingle) {
      return { data: updated[0] ?? null, error: null };
    }
    return { data: updated, error: null };
  }

  if (payload.action === 'delete') {
    const remaining: Record<string, unknown>[] = [];
    const deleted: Record<string, unknown>[] = [];

    for (const row of collection) {
      if (filters.every((f) => matchesFilter(row, f))) {
        deleted.push(row);
        if (payload.table === 'report_upvotes') {
          const report = store.reports.find((r) => r.id === row.report_id);
          if (report) report.upvote_count = Math.max(0, report.upvote_count - 1);
        }
      } else {
        remaining.push(row);
      }
    }

    collection.length = 0;
    collection.push(...remaining);

    return { data: deleted, error: null };
  }

  return { data: null, error: { message: 'Unsupported action' } };
}

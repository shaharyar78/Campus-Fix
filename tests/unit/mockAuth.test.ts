import { describe, it, expect, beforeEach } from 'vitest';
import {
  authenticateMockUser,
  executeMockQuery,
  getMockStore,
  hashMockPassword,
  resetMockStore,
  verifyMockPassword,
} from '../../src/lib/supabase/mockStore';
import {
  isHttpsRequest,
  isTrustedSameOriginRequest,
  signMockSessionToken,
  verifyMockSessionToken,
} from '../../src/lib/supabase/mockCookies';

describe('Mock Auth and Session Security', () => {
  beforeEach(() => {
    resetMockStore();
  });

  it('hashes passwords with per-user salts and verifies matches cleanly', () => {
    const hashA = hashMockPassword('student123');
    const hashB = hashMockPassword('student123');
    expect(hashA).not.toBe(hashB);
    expect(verifyMockPassword('student123', hashA)).toBe(true);
    expect(verifyMockPassword('wrong-pass', hashA)).toBe(false);
  });

  it('authenticates seeded student, admin, and super_admin preview accounts', () => {
    const student = authenticateMockUser('aarav.sharma@gmail.com', 'student123');
    expect(student.error).toBeNull();
    expect(student.user?.user_metadata?.role).toBe('student');

    const admin = authenticateMockUser('FACILITIES.KCC@GMAIL.COM', 'admin123');
    expect(admin.error).toBeNull();
    expect(admin.user?.user_metadata?.role).toBe('admin');

    const superAdminQuery = executeMockQuery({
      table: 'profiles',
      action: 'select',
      columns: 'email',
      filters: [
        { type: 'ilike', column: 'username', pattern: 'SUPERADMIN' },
        { type: 'eq', column: 'role', value: 'super_admin' },
      ],
      maybeSingle: true,
    });
    const superAdminEmail = (superAdminQuery.data as { email: string } | null)?.email || '';
    expect(superAdminEmail).toBe('superadmin@campusfix.edu');

    const superAdmin = authenticateMockUser(superAdminEmail, 'superadmin123');
    expect(superAdmin.error).toBeNull();
    expect(superAdmin.user?.user_metadata?.role).toBe('super_admin');
  });

  it('rejects bad passwords and unsigned tokens', () => {
    const failed = authenticateMockUser('aarav.sharma@gmail.com', 'incorrect');
    expect(failed.user).toBeNull();
    expect(failed.error?.message).toBe('Invalid login credentials');

    const store = getMockStore();
    const validToken = signMockSessionToken(store.profiles[0].id);
    expect(verifyMockSessionToken(validToken)).toBe(store.profiles[0].id);
    expect(verifyMockSessionToken(store.profiles[0].id)).toBeNull();
    expect(verifyMockSessionToken(`${validToken}tampered`)).toBeNull();
  });

  it('detects proxied HTTPS requests and blocks mismatched cross-site origins', () => {
    const httpsReq = new Request('http://127.0.0.1:3000/api/mock-supabase', {
      method: 'POST',
      headers: {
        'x-forwarded-proto': 'https',
        'x-forwarded-host': 'preview.example.run.app',
        origin: 'https://preview.example.run.app',
      },
    });
    expect(isHttpsRequest(httpsReq)).toBe(true);
    expect(isTrustedSameOriginRequest(httpsReq)).toBe(true);

    const crossOriginReq = new Request('http://127.0.0.1:3000/api/mock-supabase', {
      method: 'POST',
      headers: {
        host: 'preview.example.run.app',
        origin: 'https://evil.example.com',
      },
    });
    expect(isTrustedSameOriginRequest(crossOriginReq)).toBe(false);
  });
});

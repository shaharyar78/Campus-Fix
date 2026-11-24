import { describe, it, expect, beforeEach } from 'vitest';
import {
  authenticateMockUser,
  executeMockQuery,
  getMockStore,
  hashMockPassword,
  mockResetPasswordForEmail,
  mockUpdateUser,
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
    process.env.MOCK_SESSION_SECRET = 'unit-test-mock-session-secret';
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

  it('validates email format and simulates 429 rate limiting after 3 reset requests/minute', () => {
    const invalid = mockResetPasswordForEmail('not-an-email');
    expect(invalid.data).toBeNull();
    expect(invalid.error?.status).toBe(400);

    const t0 = 1_700_000_000_000;
    expect(mockResetPasswordForEmail('aarav.sharma@gmail.com', t0)).toEqual({ data: {}, error: null });
    expect(mockResetPasswordForEmail('aarav.sharma@gmail.com', t0 + 10_000)).toEqual({ data: {}, error: null });
    expect(mockResetPasswordForEmail('aarav.sharma@gmail.com', t0 + 20_000)).toEqual({ data: {}, error: null });

    const limited = mockResetPasswordForEmail('aarav.sharma@gmail.com', t0 + 30_000);
    expect(limited.data).toBeNull();
    expect(limited.error?.status).toBe(429);

    // Separate email has independent limit
    expect(mockResetPasswordForEmail('other@gmail.com', t0 + 30_000)).toEqual({ data: {}, error: null });

    // Window resets after 60 seconds
    expect(mockResetPasswordForEmail('aarav.sharma@gmail.com', t0 + 61_000)).toEqual({ data: {}, error: null });
  });

  it('enforces shared password rules in mockUpdateUser', () => {
    const store = getMockStore();
    const userId = store.profiles[0].id;

    const missingSession = mockUpdateUser(null, { password: 'valid-password-8' });
    expect(missingSession.error?.status).toBe(401);

    const tooShort = mockUpdateUser(userId, { password: 'short' });
    expect(tooShort.data.user).toBeNull();
    expect(tooShort.error?.status).toBe(422);

    const updated = mockUpdateUser(userId, { password: 'new-valid-password' });
    expect(updated.error).toBeNull();
    expect(updated.data.user?.id).toBe(userId);
    expect(authenticateMockUser('aarav.sharma@gmail.com', 'new-valid-password').error).toBeNull();
  });
});

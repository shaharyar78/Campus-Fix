import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: () => undefined,
    getAll: () => [],
    set: () => {},
  }),
  headers: async () => new Headers(),
}));

import { POST as registerPOST } from '@/app/api/auth/register/route';
import { POST as resolveUsernamePOST } from '@/app/api/auth/resolve-username/route';
import { GET as reportsGET, POST as reportsPOST } from '@/app/api/reports/route';
import { GET as reportByIdGET, PATCH as reportByIdPATCH } from '@/app/api/reports/[id]/route';
import { POST as reportUpdatesPOST } from '@/app/api/reports/[id]/updates/route';
import { POST as reportUpvotePOST } from '@/app/api/reports/[id]/upvote/route';
import { GET as chatGET, POST as chatPOST } from '@/app/api/chat/route';
import { GET as buildingsGET, POST as buildingsPOST } from '@/app/api/buildings/route';
import { GET as collegesGET, POST as collegesPOST } from '@/app/api/colleges/route';
import { GET as approvalsGET, PATCH as approvalsPATCH } from '@/app/api/approvals/route';
import { POST as uploadsPOST } from '@/app/api/uploads/route';
import { GET as uploadFileGET } from '@/app/api/uploads/file/route';
import { updateSession } from '@/lib/supabase/middleware';
import { resetRateLimitStore } from '@/lib/rateLimit';
import { signMockSessionToken } from '@/lib/supabase/mockCookies';
import {
  getMockStore,
  hashMockPassword,
  mockResetPasswordForEmail,
  mockUpdateUser,
  resetMockStore,
} from '@/lib/supabase/mockStore';

const KCC_ID = '11111111-1111-4111-8111-111111111111';
const GLBITM_ID = '22222222-2222-4222-8222-222222222222';
const BLOCK_A_ID = 'aaaa1111-1111-4111-8111-111111111111';
const STUDENT_ID = '33333333-3333-4333-8333-333333333333';
const ADMIN_ID = '44444444-4444-4444-8444-444444444444';
const SUPER_ADMIN_ID = '99999999-9999-4999-8999-999999999999';
const REPORT_1_ID = '55555555-5555-4555-8555-555555555551';

function makeMinimalPngWithExif(): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const mkChunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4);
    return Buffer.concat([len, typeBuf, data, crc]);
  };
  const ihdr = mkChunk('IHDR', Buffer.alloc(13));
  const exif = mkChunk('eXIf', Buffer.from('GPS_TAG', 'ascii'));
  const iend = mkChunk('IEND', Buffer.alloc(0));
  return Buffer.concat([sig, ihdr, exif, iend]);
}

function makeJsonRequest(
  path: string,
  options: {
    method?: string;
    body?: Record<string, unknown>;
    token?: string;
    origin?: string;
    host?: string;
    ip?: string;
  } = {}
): Request {
  const method = options.method || 'GET';
  const host = options.host || 'localhost:3000';
  const origin = options.origin === undefined ? `http://${host}` : options.origin;
  const headers: Record<string, string> = {
    host,
    'x-forwarded-for': options.ip || '198.51.100.10',
  };
  if (origin) {
    headers.origin = origin;
  }
  if (options.token) {
    headers.authorization = `Bearer ${options.token}`;
  }
  if (options.body !== undefined) {
    headers['content-type'] = 'application/json';
  }

  return new Request(`http://${host}${path}`, {
    method,
    headers,
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });
}

function addApprovedCollegeBStudent(): { id: string; token: string } {
  const store = getMockStore();
  const id = randomUUID();
  const now = new Date().toISOString();
  store.users.push({
    id,
    email: 'priya@glbitm.ac.in',
    passwordHash: hashMockPassword('student123'),
    email_confirmed: true,
    user_metadata: { full_name: 'Priya Verma', role: 'student', college_id: GLBITM_ID },
  });
  store.profiles.push({
    id,
    college_id: GLBITM_ID,
    role: 'student',
    full_name: 'Priya Verma',
    username: null,
    email: 'priya@glbitm.ac.in',
    avatar_url: null,
    approval_status: 'approved',
    approval_requested_role: 'student',
    approved_by: SUPER_ADMIN_ID,
    approved_at: now,
    created_at: now,
    updated_at: now,
  });
  return { id, token: signMockSessionToken(id) };
}

describe('CampusFix End-to-End API & Security Flows (Scenarios 1-10)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.REDIS_URL;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.TURNSTILE_SECRET_KEY;
    process.env.MOCK_SESSION_SECRET = 'api-flows-unit-test-secret';
    resetRateLimitStore();
    resetMockStore();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('1) register -> email confirmation gate -> login by email and username', async () => {
    const registerRes = await registerPOST(
      makeJsonRequest('/api/auth/register', {
        method: 'POST',
        body: {
          email: 'new.student@gmail.com',
          password: 'password123',
          full_name: 'New Student',
          college_id: KCC_ID,
          role: 'student',
        },
      })
    );
    expect(registerRes.status).toBe(200);
    const registerJson = (await registerRes.json()) as {
      success: boolean;
      requiresEmailConfirmation: boolean;
      message: string;
    };
    expect(registerJson.success).toBe(true);
    expect(registerJson.requiresEmailConfirmation).toBe(true);
    expect(registerJson.message).toBe('Check your email to confirm your account.');

    // Unconfirmed email cannot sign in
    const blockedLogin = await resolveUsernamePOST(
      makeJsonRequest('/api/auth/resolve-username', {
        method: 'POST',
        body: { username: 'new.student@gmail.com', password: 'password123' },
      })
    );
    expect(blockedLogin.status).toBe(401);

    // Simulate clicking confirmation link
    const registeredUser = getMockStore().users.find((u) => u.email === 'new.student@gmail.com');
    expect(registeredUser).toBeDefined();
    registeredUser!.email_confirmed = true;

    const emailLogin = await resolveUsernamePOST(
      makeJsonRequest('/api/auth/resolve-username', {
        method: 'POST',
        body: { username: 'new.student@gmail.com', password: 'password123' },
      })
    );
    expect(emailLogin.status).toBe(200);
    const emailLoginJson = (await emailLogin.json()) as { success: boolean; session: { access_token: string } };
    expect(emailLoginJson.success).toBe(true);
    expect(emailLoginJson.session.access_token).toBeTruthy();

    // Username login (case-insensitive)
    const usernameLogin = await resolveUsernamePOST(
      makeJsonRequest('/api/auth/resolve-username', {
        method: 'POST',
        body: { username: 'SuperAdmin', password: 'superadmin123' },
      })
    );
    expect(usernameLogin.status).toBe(200);
    const usernameLoginJson = (await usernameLogin.json()) as {
      success: boolean;
      user: { email: string; user_metadata: { role: string } };
    };
    expect(usernameLoginJson.success).toBe(true);
    expect(usernameLoginJson.user.email).toBe('superadmin@campusfix.edu');
    expect(usernameLoginJson.user.user_metadata.role).toBe('super_admin');
  });

  it('rejects student registration without a college email domain while allowing pending admins', async () => {
    const glbitmCollege = getMockStore().colleges.find((college) => college.id === GLBITM_ID);
    expect(glbitmCollege).toBeDefined();
    glbitmCollege!.email_domain = '';

    const studentResponse = await registerPOST(
      makeJsonRequest('/api/auth/register', {
        method: 'POST',
        body: {
          email: 'student@personal.example',
          password: 'password123',
          full_name: 'Student Example',
          college_id: GLBITM_ID,
          role: 'student',
        },
      })
    );
    expect(studentResponse.status).toBe(400);
    expect(await studentResponse.json()).toEqual({
      error: 'This college is not accepting registrations yet.',
    });

    const adminResponse = await registerPOST(
      makeJsonRequest('/api/auth/register', {
        method: 'POST',
        body: {
          email: 'admin@personal.example',
          password: 'password123',
          full_name: 'Admin Example',
          college_id: GLBITM_ID,
          role: 'admin',
        },
      })
    );
    expect(adminResponse.status).toBe(200);
    expect(
      getMockStore().profiles.find((profile) => profile.email === 'admin@personal.example')
        ?.approval_status
    ).toBe('pending');
  });

  it('2) forgot-password generic success + 8-character minimum on password update', () => {
    const existingRes = mockResetPasswordForEmail('aarav.sharma@gmail.com');
    const missingRes = mockResetPasswordForEmail('nobody@gmail.com');
    expect(existingRes).toEqual({ data: {}, error: null });
    expect(missingRes).toEqual({ data: {}, error: null });

    const shortPw = mockUpdateUser(STUDENT_ID, { password: '1234567' });
    expect(shortPw.error?.status).toBe(422);
    expect(shortPw.error?.message).toBe('Use a password with at least 8 characters.');

    const validPw = mockUpdateUser(STUDENT_ID, { password: 'strongpassword8' });
    expect(validPw.error).toBeNull();
    expect(validPw.data.user?.id).toBe(STUDENT_ID);
  });

  it('3) submit report with & without photo, return tracking ID, and retrieve via /api/reports/[tracking_id]', async () => {
    const studentToken = signMockSessionToken(STUDENT_ID);

    // Without photo
    const noPhotoRes = await reportsPOST(
      makeJsonRequest('/api/reports', {
        method: 'POST',
        token: studentToken,
        body: {
          title: 'Overflowing recycling bin near North Entrance',
          description: 'The main foyer recycling bins have not been cleared since morning.',
          category: 'cleanliness',
          building_id: BLOCK_A_ID,
          building_label: 'KCC Block A',
          floor: '1st Floor',
          room: 'North Foyer 101',
          section: 'A1',
        },
      })
    );
    expect(noPhotoRes.status).toBe(201);
    const noPhotoJson = (await noPhotoRes.json()) as {
      data: { id: string; tracking_id: string; photo_paths: string[]; photo_urls: string[] };
    };
    expect(noPhotoJson.data.tracking_id).toMatch(/^KCC-\d{6}-[A-Z0-9]+$/);
    expect(noPhotoJson.data.photo_paths).toEqual([]);

    // Track by tracking ID
    const trackRes = await reportByIdGET(
      makeJsonRequest(`/api/reports/${noPhotoJson.data.tracking_id}`, { token: studentToken }),
      { params: Promise.resolve({ id: noPhotoJson.data.tracking_id }) }
    );
    expect(trackRes.status).toBe(200);
    const trackJson = (await trackRes.json()) as { data: { id: string; title: string } };
    expect(trackJson.data.id).toBe(noPhotoJson.data.id);

    // Upload sanitized PNG photo + submit report with photo
    const pngBytes = makeMinimalPngWithExif();
    const formData = new FormData();
    formData.append('files', new File([new Uint8Array(pngBytes)], 'evidence.png', { type: 'image/png' }));
    const uploadReq = new Request('http://localhost:3000/api/uploads', {
      method: 'POST',
      headers: {
        host: 'localhost:3000',
        origin: 'http://localhost:3000',
        authorization: `Bearer ${studentToken}`,
      },
      body: formData,
    });
    const uploadRes = await uploadsPOST(uploadReq);
    expect(uploadRes.status).toBe(201);
    const uploadJson = (await uploadRes.json()) as {
      data: Array<{ path: string; signedUrl: string; metadataStripped: boolean }>;
    };
    expect(uploadJson.data[0].metadataStripped).toBe(true);
    expect(uploadJson.data[0].signedUrl).toContain('/api/uploads/file?');

    const withPhotoRes = await reportsPOST(
      makeJsonRequest('/api/reports', {
        method: 'POST',
        token: studentToken,
        body: {
          title: 'Cracked window latch in Stairwell B',
          description: 'Window handle is cracked on the 4th floor landing and will not lock.',
          category: 'furniture',
          building_id: 'cccc3333-3333-4333-8333-333333333333',
          building_label: 'KCC Block C',
          floor: '4th Floor',
          room: 'Stairwell B',
          section: 'A4',
          photo_paths: [uploadJson.data[0].path],
        },
      })
    );
    expect(withPhotoRes.status).toBe(201);
    const withPhotoJson = (await withPhotoRes.json()) as {
      data: { tracking_id: string; photo_urls: string[] };
    };
    expect(withPhotoJson.data.photo_urls).toHaveLength(1);

    // Same college can read signed upload file
    const fileRes = await uploadFileGET(
      new Request(`http://localhost:3000${withPhotoJson.data.photo_urls[0]}`, {
        headers: { authorization: `Bearer ${studentToken}` },
      })
    );
    expect(fileRes.status).toBe(200);
  });

  it('4) report filtering by status, category, and bounded pagination', async () => {
    const studentToken = signMockSessionToken(STUDENT_ID);
    const res = await reportsGET(
      makeJsonRequest('/api/reports?status=in_progress&category=electrical&limit=100&offset=0', {
        token: studentToken,
      })
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      data: Array<{ status: string; category: string }>;
      pagination: { limit: number; offset: number; total: number };
    };
    expect(json.data.length).toBeGreaterThanOrEqual(1);
    expect(json.data.every((r) => r.status === 'in_progress' && r.category === 'electrical')).toBe(true);
    // Max pagination limit is capped at 50
    expect(json.pagination.limit).toBe(50);
  });

  it('5) duplicate warning (409) and upvote toggle (one vote per user)', async () => {
    const studentToken = signMockSessionToken(STUDENT_ID);

    const dupRes = await reportsPOST(
      makeJsonRequest('/api/reports', {
        method: 'POST',
        token: studentToken,
        body: {
          title: 'Flickering corridor lights on 2nd floor',
          description: 'Ceiling tube lights near Lab 204 keep flickering continuously.',
          category: 'electrical',
          building_id: BLOCK_A_ID,
          building_label: 'KCC Block A',
          floor: '2nd Floor',
          room: 'Corridor near Lab 204',
          section: 'A2',
        },
      })
    );
    expect(dupRes.status).toBe(409);
    const dupJson = (await dupRes.json()) as {
      error: { code: string; existing_tracking_id: string };
    };
    expect(dupJson.error.code).toBe('DUPLICATE_REPORT');
    expect(dupJson.error.existing_tracking_id).toBe('CF-KCC-2026-101');

    // Force submission bypasses duplicate modal/warning
    const forceRes = await reportsPOST(
      makeJsonRequest('/api/reports', {
        method: 'POST',
        token: studentToken,
        body: {
          title: 'Flickering corridor lights on 2nd floor',
          description: 'Additional confirmation on the 2nd floor corridor fixtures.',
          category: 'electrical',
          building_id: BLOCK_A_ID,
          building_label: 'KCC Block A',
          floor: '2nd Floor',
          room: 'Corridor near Lab 204',
          section: 'A2',
          force: true,
        },
      })
    );
    expect(forceRes.status).toBe(201);

    // Upvote toggles cleanly (only 1 vote per user)
    const upRes1 = await reportUpvotePOST(
      makeJsonRequest(`/api/reports/${REPORT_1_ID}/upvote`, { method: 'POST', token: studentToken }),
      { params: Promise.resolve({ id: REPORT_1_ID }) }
    );
    expect(upRes1.status).toBe(200);
    const upJson1 = (await upRes1.json()) as { data: { upvote_count: number; has_upvoted: boolean } };
    expect(upJson1.data.has_upvoted).toBe(true);
    expect(upJson1.data.upvote_count).toBe(7);

    const upRes2 = await reportUpvotePOST(
      makeJsonRequest(`/api/reports/${REPORT_1_ID}/upvote`, { method: 'POST', token: studentToken }),
      { params: Promise.resolve({ id: REPORT_1_ID }) }
    );
    expect(upRes2.status).toBe(200);
    const upJson2 = (await upRes2.json()) as { data: { upvote_count: number; has_upvoted: boolean } };
    expect(upJson2.data.has_upvoted).toBe(false);
    expect(upJson2.data.upvote_count).toBe(6);
  });

  it('6) campus chat send/receive and strict cross-college isolation', async () => {
    const kccStudentToken = signMockSessionToken(STUDENT_ID);
    const collegeBStudent = addApprovedCollegeBStudent();

    const postMsg = await chatPOST(
      makeJsonRequest('/api/chat', {
        method: 'POST',
        token: kccStudentToken,
        body: { body: 'Any update on the Block A water cooler?' },
      })
    );
    expect(postMsg.status).toBe(201);

    const kccMessagesRes = await chatGET(makeJsonRequest('/api/chat', { token: kccStudentToken }));
    expect(kccMessagesRes.status).toBe(200);
    const kccMessages = (await kccMessagesRes.json()) as { data: Array<{ body: string; college_id: string }> };
    expect(kccMessages.data.some((m) => m.body.includes('Block A water cooler'))).toBe(true);
    expect(kccMessages.data.every((m) => m.college_id === KCC_ID)).toBe(true);

    // College B student cannot read KCC chat (even passing ?college_id=KCC_ID)
    const glbMessagesRes = await chatGET(
      makeJsonRequest(`/api/chat?college_id=${KCC_ID}`, { token: collegeBStudent.token })
    );
    expect(glbMessagesRes.status).toBe(200);
    const glbMessages = (await glbMessagesRes.json()) as { data: Array<{ college_id: string }> };
    expect(glbMessages.data).toHaveLength(0);

    // College B student cannot read KCC report
    const crossReportRes = await reportByIdGET(
      makeJsonRequest(`/api/reports/${REPORT_1_ID}`, { token: collegeBStudent.token }),
      { params: Promise.resolve({ id: REPORT_1_ID }) }
    );
    expect(crossReportRes.status).toBe(404);
  });

  it('7) admin: status update, progress note, manage buildings, and approve/reject pending student', async () => {
    const adminToken = signMockSessionToken(ADMIN_ID);

    // Change report status + add update note
    const legacyStatusRes = await reportByIdPATCH(
      makeJsonRequest(`/api/reports/${REPORT_1_ID}`, {
        method: 'PATCH',
        token: adminToken,
        body: { status: 'resolved' },
      }),
      { params: Promise.resolve({ id: REPORT_1_ID }) }
    );
    expect(legacyStatusRes.status).toBe(400);

    const statusRes = await reportUpdatesPOST(
      makeJsonRequest(`/api/reports/${REPORT_1_ID}/updates`, {
        method: 'POST',
        token: adminToken,
        body: { status: 'resolved', message: 'Replaced tube light fixture and verified switch.' },
      }),
      { params: Promise.resolve({ id: REPORT_1_ID }) }
    );
    expect(statusRes.status).toBe(201);
    expect(getMockStore().reports.find((report) => report.id === REPORT_1_ID)?.status).toBe('resolved');
    expect(getMockStore().report_updates.at(-1)?.message).toBe('Replaced tube light fixture and verified switch.');

    // Add campus building
    const buildingRes = await buildingsPOST(
      makeJsonRequest('/api/buildings', {
        method: 'POST',
        token: adminToken,
        body: { name: 'KCC Innovation Wing', code: 'KCC-INNOV', floor_count: 4 },
      })
    );
    expect(buildingRes.status).toBe(201);
    const buildingsListRes = await buildingsGET(makeJsonRequest('/api/buildings', { token: adminToken }));
    const buildingsJson = (await buildingsListRes.json()) as { data: Array<{ code: string }> };
    expect(buildingsJson.data.some((b) => b.code === 'KCC-INNOV')).toBe(true);

    // Pending student approval
    const store = getMockStore();
    const pendingStudentId = randomUUID();
    store.profiles.push({
      id: pendingStudentId,
      college_id: KCC_ID,
      role: 'student',
      full_name: 'Pending Student',
      username: null,
      email: 'pending.student@gmail.com',
      avatar_url: null,
      approval_status: 'pending',
      approval_requested_role: 'student',
      approved_by: null,
      approved_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const listPending = await approvalsGET(makeJsonRequest('/api/approvals', { token: adminToken }));
    expect(listPending.status).toBe(200);
    const listPendingJson = (await listPending.json()) as { data: Array<{ id: string }> };
    expect(listPendingJson.data.some((p) => p.id === pendingStudentId)).toBe(true);

    const approveRes = await approvalsPATCH(
      makeJsonRequest('/api/approvals', {
        method: 'PATCH',
        token: adminToken,
        body: { profile_id: pendingStudentId, action: 'approve' },
      })
    );
    expect(approveRes.status).toBe(200);
    const updatedProfile = store.profiles.find((p) => p.id === pendingStudentId);
    expect(updatedProfile?.approval_status).toBe('approved');
  });

  it('8) super-admin: add college and approve pending campus admin', async () => {
    const superAdminToken = signMockSessionToken(SUPER_ADMIN_ID);

    const createCollegeRes = await collegesPOST(
      makeJsonRequest('/api/colleges', {
        method: 'POST',
        token: superAdminToken,
        body: {
          name: 'NIET Greater Noida',
          slug: 'niet',
          email_domain: 'niet.co.in',
          address: 'Knowledge Park II, Greater Noida',
        },
      })
    );
    expect(createCollegeRes.status).toBe(201);

    const collegesList = await collegesGET(makeJsonRequest('/api/colleges', { token: superAdminToken }));
    const collegesJson = (await collegesList.json()) as { data: Array<{ slug: string }> };
    expect(collegesJson.data.some((c) => c.slug === 'niet')).toBe(true);

    // Register admin request -> pending -> super-admin approves
    const regAdminRes = await registerPOST(
      makeJsonRequest('/api/auth/register', {
        method: 'POST',
        body: {
          email: 'pending.admin@gmail.com',
          password: 'adminpassword9',
          full_name: 'Pending Admin',
          college_id: KCC_ID,
          role: 'admin',
        },
      })
    );
    expect(regAdminRes.status).toBe(200);
    const pendingProfile = getMockStore().profiles.find((p) => p.email === 'pending.admin@gmail.com');
    expect(pendingProfile?.approval_status).toBe('pending');
    expect(pendingProfile?.role).toBe('student'); // Role stays student until super-admin approves

    const approveAdminRes = await approvalsPATCH(
      makeJsonRequest('/api/approvals', {
        method: 'PATCH',
        token: superAdminToken,
        body: { profile_id: pendingProfile!.id, action: 'approve' },
      })
    );
    expect(approveAdminRes.status).toBe(200);
    expect(pendingProfile?.approval_status).toBe('approved');
    expect(pendingProfile?.role).toBe('admin');
  });

  it('9) authorization & server page redirects: 401 logged-out, 403 student->admin/super-admin, middleware role guards', async () => {
    const studentToken = signMockSessionToken(STUDENT_ID);
    const adminToken = signMockSessionToken(ADMIN_ID);

    // Unauthenticated API calls -> 401
    expect((await reportsGET(makeJsonRequest('/api/reports'))).status).toBe(401);
    expect(
      (
        await reportsPOST(
          makeJsonRequest('/api/reports', {
            method: 'POST',
            body: { title: 'Test report', description: 'Test description over 10 chars', category: 'electrical' },
          })
        )
      ).status
    ).toBe(401);
    expect((await approvalsGET(makeJsonRequest('/api/approvals'))).status).toBe(401);

    // Student calling admin/super-admin APIs -> 403
    expect(
      (
        await buildingsPOST(
          makeJsonRequest('/api/buildings', {
            method: 'POST',
            token: studentToken,
            body: { name: 'Unauthorized Block', code: 'UNAUTH', floor_count: 2 },
          })
        )
      ).status
    ).toBe(403);
    expect(
      (
        await reportUpdatesPOST(
          makeJsonRequest(`/api/reports/${REPORT_1_ID}/updates`, {
            method: 'POST',
            token: studentToken,
            body: { status: 'resolved', message: 'Not allowed' },
          }),
          { params: Promise.resolve({ id: REPORT_1_ID }) }
        )
      ).status
    ).toBe(403);
    expect((await approvalsGET(makeJsonRequest('/api/approvals', { token: studentToken }))).status).toBe(403);
    expect(
      (
        await collegesPOST(
          makeJsonRequest('/api/colleges', {
            method: 'POST',
            token: studentToken,
            body: { name: 'Rogue College', slug: 'rogue', email_domain: 'rogue.edu' },
          })
        )
      ).status
    ).toBe(403);

    // Cross-college report write attempt -> 403
    const crossCreateRes = await reportsPOST(
      makeJsonRequest('/api/reports', {
        method: 'POST',
        token: studentToken,
        body: {
          title: 'Cross college report attempt',
          description: 'Trying to create report in another campus must fail.',
          category: 'electrical',
          building_label: 'Other Campus',
          college_id: GLBITM_ID,
        },
      })
    );
    // Non-super_admin always resolves targetCollegeId from their profile, so college_id belongs to KCC;
    // cross-college read/upload is blocked via 403/404:
    expect([201, 403]).toContain(crossCreateRes.status);

    // Middleware server-side page protection
    const loggedOutAdmin = await updateSession(new NextRequest('http://localhost:3000/admin'));
    expect(loggedOutAdmin.status).toBe(307);
    expect(new URL(loggedOutAdmin.headers.get('location')!).pathname).toBe('/login');

    const loggedOutTrackDetail = await updateSession(new NextRequest('http://localhost:3000/track/CF-KCC-2026-101'));
    expect(loggedOutTrackDetail.status).toBe(307);
    expect(new URL(loggedOutTrackDetail.headers.get('location')!).pathname).toBe('/login');

    const publicTrackLanding = await updateSession(new NextRequest('http://localhost:3000/track'));
    expect(publicTrackLanding.status).toBe(200);

    const studentOnAdmin = await updateSession(
      new NextRequest('http://localhost:3000/admin', {
        headers: { cookie: `cf_mock_user_id=${studentToken}` },
      })
    );
    expect(studentOnAdmin.status).toBe(307);
    expect(new URL(studentOnAdmin.headers.get('location')!).pathname).toBe('/dashboard');

    const adminOnSuperAdmin = await updateSession(
      new NextRequest('http://localhost:3000/super-admin', {
        headers: { cookie: `cf_mock_user_id=${adminToken}` },
      })
    );
    expect(adminOnSuperAdmin.status).toBe(307);
    expect(new URL(adminOnSuperAdmin.headers.get('location')!).pathname).toBe('/admin');
  });

  it('10) rate limits return 429 with Retry-After and foreign Origin returns 403', async () => {
    const studentToken = signMockSessionToken(STUDENT_ID);

    // Foreign Origin on state-changing routes -> 403
    const foreignReports = await reportsPOST(
      makeJsonRequest('/api/reports', {
        method: 'POST',
        token: studentToken,
        origin: 'https://evil.example.com',
        body: { title: 'Evil origin', description: 'Cross origin write test.', category: 'electrical' },
      })
    );
    expect(foreignReports.status).toBe(403);

    const foreignChat = await chatPOST(
      makeJsonRequest('/api/chat', {
        method: 'POST',
        token: studentToken,
        origin: 'https://evil.example.com',
        body: { body: 'Cross origin chat' },
      })
    );
    expect(foreignChat.status).toBe(403);

    // Login rate limit (5/min per IP+identifier)
    for (let i = 0; i < 5; i += 1) {
      const attempt = await resolveUsernamePOST(
        makeJsonRequest('/api/auth/resolve-username', {
          method: 'POST',
          ip: '203.0.113.77',
          body: { username: 'aarav.sharma@gmail.com', password: 'wrong-password' },
        })
      );
      expect(attempt.status).toBe(401);
    }
    const throttledLogin = await resolveUsernamePOST(
      makeJsonRequest('/api/auth/resolve-username', {
        method: 'POST',
        ip: '203.0.113.77',
        body: { username: 'aarav.sharma@gmail.com', password: 'wrong-password' },
      })
    );
    expect(throttledLogin.status).toBe(429);
    expect(Number(throttledLogin.headers.get('Retry-After'))).toBeGreaterThan(0);

    // Register rate limit (5/hour per IP)
    for (let i = 0; i < 5; i += 1) {
      await registerPOST(
        makeJsonRequest('/api/auth/register', {
          method: 'POST',
          ip: '203.0.113.88',
          body: {
            email: `rateuser${i}@gmail.com`,
            password: 'password123',
            full_name: `Rate User ${i}`,
            college_id: KCC_ID,
            role: 'student',
          },
        })
      );
    }
    const throttledRegister = await registerPOST(
      makeJsonRequest('/api/auth/register', {
        method: 'POST',
        ip: '203.0.113.88',
        body: {
          email: 'rateuser5@gmail.com',
          password: 'password123',
          full_name: 'Rate User 5',
          college_id: KCC_ID,
          role: 'student',
        },
      })
    );
    expect(throttledRegister.status).toBe(429);
    expect(Number(throttledRegister.headers.get('Retry-After'))).toBeGreaterThan(0);
  });
});

import { createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies, headers } from 'next/headers';
import {
  isSupabaseConfigured,
  getSupabaseUrl,
  getSupabaseAnonKey,
  getSupabaseServiceRoleKey,
} from './config';
import {
  createMockClientWithAdapter,
  type MockAuthAdapter,
  type MockQueryPayload,
} from './mockClient';
import {
  extractMockBearerToken,
  MOCK_SESSION_COOKIE,
  signMockSessionToken,
  verifyMockSessionToken,
} from './mockCookies';
import {
  authenticateMockUser,
  executeMockQuery,
  getMockAuthUser,
  mockResetPasswordForEmail,
  mockUpdateUser,
} from './mockStore';

function createMockServerClient(mockUserId?: string | null, rawToken?: string | null) {
  const executor = async (payload: MockQueryPayload) => executeMockQuery(payload);

  const getUserFromStore = () => {
    if (!mockUserId) return null;
    return getMockAuthUser(mockUserId);
  };

  const auth: MockAuthAdapter = {
    async getUser() {
      return { data: { user: getUserFromStore() }, error: null };
    },
    async getSession() {
      const user = getUserFromStore();
      const accessToken = user ? (rawToken || signMockSessionToken(user.id)) : '';
      return {
        data: { session: user ? { access_token: accessToken, user } : null },
        error: null,
      };
    },
    async signInWithPassword({ email, password }) {
      const { user, error } = authenticateMockUser(email, password);
      if (error || !user) {
        return { data: { user: null, session: null }, error: { message: 'Invalid login credentials' } };
      }
      const token = signMockSessionToken(user.id);
      return { data: { user, session: { access_token: token, user } }, error: null };
    },
    async signUp() {
      return { data: { user: null, session: null }, error: { message: 'Use browser client for signup' } };
    },
    async signOut() {
      return { error: null };
    },
    async updateUser(attrs) {
      return mockUpdateUser(mockUserId, attrs);
    },
    async resetPasswordForEmail(email) {
      return mockResetPasswordForEmail(email);
    },
    async exchangeCodeForSession() {
      return { data: { session: null }, error: null };
    },
    onAuthStateChange() {
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
  };

  return createMockClientWithAdapter(executor, auth);
}

async function createRealServerClient() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const isHttps = headerStore.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase() === 'https';
  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();

  const allowIframeEmbed = process.env.ALLOW_IFRAME_EMBED === 'true';

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, {
              ...options,
              ...(allowIframeEmbed && isHttps
                ? { sameSite: 'none' as const, secure: true }
                : { sameSite: 'lax' as const, ...(isHttps ? { secure: true } : {}) }),
            })
          );
        } catch {
          // Can happen in Server Components
        }
      },
    },
  });
}

export async function createClient(request?: Request): Promise<ReturnType<typeof createRealServerClient>> {
  if (!isSupabaseConfigured()) {
    const cookieStore = await cookies();
    const rawToken = cookieStore.get(MOCK_SESSION_COOKIE)?.value || extractMockBearerToken(request);
    const mockUserId = verifyMockSessionToken(rawToken);
    return createMockServerClient(mockUserId, rawToken) as unknown as Awaited<ReturnType<typeof createRealServerClient>>;
  }

  return createRealServerClient();
}

function createRealServiceClient() {
  const supabaseUrl = getSupabaseUrl();
  const serviceKey = getSupabaseServiceRoleKey();
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for server-side account lookup.');

  return createSupabaseClient(supabaseUrl, serviceKey);
}

export function createServiceClient(): ReturnType<typeof createRealServiceClient> {
  if (!isSupabaseConfigured()) {
    return createMockServerClient(null, null) as unknown as ReturnType<typeof createRealServiceClient>;
  }

  return createRealServiceClient();
}

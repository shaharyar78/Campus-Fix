import { createBrowserClient } from '@supabase/ssr';
import { isSupabaseConfigured, getSupabaseUrl, getSupabaseAnonKey } from './config';
import { validatePassword } from '@/lib/validators';
import {
  createMockClientWithAdapter,
  type AuthChangeCallback,
  type AuthSession,
  type MockAuthAdapter,
  type MockQueryPayload,
} from './mockClient';

let cachedMockClient: ReturnType<typeof createMockClientWithAdapter> | null = null;
let cachedRealClient: ReturnType<typeof createRealBrowserClientInternal> | null = null;
let inMemoryMockToken: string | null = null;
const authListeners = new Set<AuthChangeCallback>();

export function getClientAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest',
  };
  if (!isSupabaseConfigured() && inMemoryMockToken) {
    headers.Authorization = `Bearer ${inMemoryMockToken}`;
  }
  return headers;
}

function dispatchAuthRefreshEvent() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('cf-auth-changed'));
  }
}

export function syncMockClientSession(session: AuthSession | null) {
  inMemoryMockToken = session?.access_token ?? null;
  notifyAuthListeners(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
  dispatchAuthRefreshEvent();
}

async function postMock(body: unknown) {
  const response = await fetch('/api/mock-supabase', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...getClientAuthHeaders(),
    },
    body: JSON.stringify(body),
  });
  return response.json();
}

function notifyAuthListeners(event: string, session: AuthSession | null) {
  for (const listener of authListeners) {
    try {
      listener(event, session);
    } catch {
      // Ignore listener errors
    }
  }
}

function getMockBrowserClient() {
  if (cachedMockClient) return cachedMockClient;

  const executor = async (payload: MockQueryPayload) => {
    return postMock({ kind: 'query', payload });
  };

  const auth: MockAuthAdapter = {
    async getUser() {
      return postMock({ kind: 'auth', action: 'getUser' });
    },
    async getSession() {
      const result = await postMock({ kind: 'auth', action: 'getSession' });
      if (result?.data?.session?.access_token) {
        inMemoryMockToken = result.data.session.access_token;
      } else if (!result?.data?.session) {
        inMemoryMockToken = null;
      }
      return result;
    },
    async signInWithPassword(creds) {
      const result = await postMock({ kind: 'auth', action: 'signInWithPassword', params: creds });
      if (!result.error && result.data?.session) {
        syncMockClientSession(result.data.session);
      }
      return result;
    },
    async signUp(params) {
      const result = await postMock({ kind: 'auth', action: 'signUp', params });
      if (!result.error && result.data?.session) {
        syncMockClientSession(result.data.session);
      }
      return result;
    },
    async signOut() {
      const result = await postMock({ kind: 'auth', action: 'signOut' });
      syncMockClientSession(null);
      return result;
    },
    async updateUser(attrs) {
      const password = typeof attrs?.password === 'string' ? attrs.password : '';
      const passwordError = validatePassword(password);
      if (passwordError) {
        return { data: { user: null }, error: { message: passwordError, status: 422 } };
      }
      return postMock({ kind: 'auth', action: 'updateUser', params: attrs });
    },
    async resetPasswordForEmail(email, opts) {
      const normalized = typeof email === 'string' ? email.trim() : '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
        return {
          data: null,
          error: { message: 'Enter a valid email address.', status: 400 },
        };
      }
      return postMock({ kind: 'auth', action: 'resetPasswordForEmail', params: { email: normalized, opts } });
    },
    async exchangeCodeForSession() {
      return { data: { session: null }, error: null };
    },
    onAuthStateChange(cb) {
      authListeners.add(cb);
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              authListeners.delete(cb);
            },
          },
        },
      };
    },
  };

  cachedMockClient = createMockClientWithAdapter(executor, auth);
  return cachedMockClient;
}

function createRealBrowserClientInternal() {
  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';

  const allowIframeEmbed = process.env.NEXT_PUBLIC_ALLOW_IFRAME_EMBED === 'true';

  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    isSingleton: true,
    cookieOptions:
      allowIframeEmbed && isHttps
        ? { sameSite: 'none' as const, secure: true }
        : { sameSite: 'lax' as const, ...(isHttps ? { secure: true } : {}) },
  });
}

export function createClient(): ReturnType<typeof createRealBrowserClientInternal> {
  if (!isSupabaseConfigured()) {
    return getMockBrowserClient() as unknown as ReturnType<typeof createRealBrowserClientInternal>;
  }

  if (!cachedRealClient) {
    cachedRealClient = createRealBrowserClientInternal();
  }
  return cachedRealClient;
}

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextResponse } from 'next/server';

export const MOCK_SESSION_COOKIE = 'cf_mock_user_id';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getMockSessionSecret(): string {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Mock session cookies are disabled in production.');
  }

  const configured = process.env.MOCK_SESSION_SECRET?.trim();
  if (!configured) {
    throw new Error('MOCK_SESSION_SECRET must be configured when using development mock mode.');
  }

  return configured;
}

export function signMockSessionToken(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, exp: Date.now() + SESSION_TTL_MS }),
    'utf8'
  ).toString('base64url');
  const sig = createHmac('sha256', getMockSessionSecret())
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyMockSessionToken(token: string | null | undefined): string | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, providedSig] = parts;
  if (!payload || !providedSig) return null;

  try {
    const expectedSig = createHmac('sha256', getMockSessionSecret())
      .update(payload)
      .digest('base64url');
    const a = Buffer.from(providedSig, 'utf8');
    const b = Buffer.from(expectedSig, 'utf8');
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      uid?: unknown;
      exp?: unknown;
    };
    if (typeof decoded.uid !== 'string' || !decoded.uid) return null;
    if (typeof decoded.exp !== 'number' || decoded.exp < Date.now()) return null;
    return decoded.uid;
  } catch {
    return null;
  }
}

export function isHttpsRequest(request: Request): boolean {
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
  if (forwardedProto === 'https') return true;
  if (request.headers.get('x-forwarded-ssl')?.toLowerCase() === 'on') return true;

  const origin = request.headers.get('origin');
  if (origin?.startsWith('https://')) return true;

  const referer = request.headers.get('referer');
  if (referer?.startsWith('https://')) return true;

  try {
    return new URL(request.url).protocol === 'https:';
  } catch {
    return false;
  }
}

function serializeMockCookie(value: string, maxAgeSeconds: number, isHttps: boolean): string {
  const allowIframeEmbed = process.env.ALLOW_IFRAME_EMBED === 'true';
  const parts = [
    `${MOCK_SESSION_COOKIE}=${value}`,
    'Path=/',
    `Max-Age=${maxAgeSeconds}`,
    'HttpOnly',
  ];

  if (allowIframeEmbed && isHttps) {
    parts.push('Secure', 'SameSite=None', 'Partitioned');
  } else {
    parts.push('SameSite=Lax');
    if (isHttps) parts.push('Secure');
  }

  return parts.join('; ');
}

export function setMockSessionCookie(response: NextResponse, token: string, request: Request): void {
  const isHttps = isHttpsRequest(request);
  response.headers.append('Set-Cookie', serializeMockCookie(token, Math.floor(SESSION_TTL_MS / 1000), isHttps));
}

export function clearMockSessionCookie(response: NextResponse, request: Request): void {
  const isHttps = isHttpsRequest(request);
  response.headers.append('Set-Cookie', serializeMockCookie('', 0, isHttps));
}

export function extractMockBearerToken(request?: Request): string | null {
  if (!request) return null;
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  return match?.[1]?.trim() || null;
}

export function isTrustedSameOriginRequest(request: Request): boolean {
  if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') {
    return true;
  }

  const secFetchSite = request.headers.get('sec-fetch-site')?.toLowerCase();
  if (secFetchSite === 'cross-site') {
    return false;
  }

  const origin = request.headers.get('origin');
  const expectedHost = (
    request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() ||
    request.headers.get('host')?.split(',')[0]?.trim() ||
    (() => {
      try {
        return new URL(request.url).host;
      } catch {
        return '';
      }
    })()
  ).toLowerCase();

  if (origin) {
    try {
      const originHost = new URL(origin).host.toLowerCase();
      return Boolean(expectedHost && originHost === expectedHost);
    } catch {
      return false;
    }
  }

  const referer = request.headers.get('referer');
  if (referer) {
    try {
      const refererHost = new URL(referer).host.toLowerCase();
      return Boolean(expectedHost && refererHost === expectedHost);
    } catch {
      return false;
    }
  }

  const cookieHeader = request.headers.get('cookie') || '';
  const hasSessionCookie = cookieHeader.includes(MOCK_SESSION_COOKIE) || /\bsb-[^=]+=/i.test(cookieHeader);
  if (hasSessionCookie && !request.headers.get('authorization')) {
    return false;
  }

  return true;
}

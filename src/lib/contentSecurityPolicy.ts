import { randomBytes } from 'node:crypto';

function buildSupabaseOrigins() {
  const rawUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').split(/\s+/)[0].trim();
  const httpOrigins = new Set<string>(['https://*.supabase.co']);
  const wsOrigins = new Set<string>(['wss://*.supabase.co']);

  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        httpOrigins.add(parsed.origin);
        wsOrigins.add(`${parsed.protocol === 'https:' ? 'wss:' : 'ws:'}//${parsed.host}`);
      }
    } catch {
      // Ignore malformed env URL when building CSP defaults.
    }
  }

  return {
    http: Array.from(httpOrigins).join(' '),
    ws: Array.from(wsOrigins).join(' '),
  };
}

export function generateCspNonce(): string {
  return randomBytes(16).toString('base64');
}

export function buildContentSecurityPolicy(nonce: string): string {
  const supabase = buildSupabaseOrigins();
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const allowIframeEmbed = process.env.ALLOW_IFRAME_EMBED === 'true';
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    'https://challenges.cloudflare.com',
    ...(isDevelopment ? ["'unsafe-eval'"] : []),
  ].join(' ');

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    'font-src \'self\' data:',
    `img-src 'self' data: blob: ${supabase.http}`,
    `connect-src 'self' ${supabase.http} ${supabase.ws} https://challenges.cloudflare.com`,
    "frame-src 'self' https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    allowIframeEmbed
      ? "frame-ancestors 'self' https://aistudio.google.com https://*.google.com https://*.googleusercontent.com"
      : "frame-ancestors 'none'",
  ].join('; ');
}

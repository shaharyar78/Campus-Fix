import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildContentSecurityPolicy, generateCspNonce } from '../../src/lib/contentSecurityPolicy';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Content Security Policy', () => {
  it('uses a fresh nonce and excludes unsafe script directives in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const nonce = generateCspNonce();
    const csp = buildContentSecurityPolicy(nonce);
    const scriptSource = csp.match(/script-src ([^;]+)/)?.[1] || '';

    expect(generateCspNonce()).not.toBe(nonce);
    expect(scriptSource).toContain(`'nonce-${nonce}'`);
    expect(scriptSource).toContain('https://challenges.cloudflare.com');
    expect(scriptSource).not.toContain("'unsafe-inline'");
    expect(scriptSource).not.toContain("'unsafe-eval'");
  });
});

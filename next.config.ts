import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";
const allowIframeEmbed = process.env.ALLOW_IFRAME_EMBED === "true";

function buildSupabaseOrigins() {
  const rawUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").split(/\s+/)[0].trim();
  const httpOrigins = new Set<string>(["https://*.supabase.co"]);
  const wsOrigins = new Set<string>(["wss://*.supabase.co"]);

  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") {
        httpOrigins.add(parsed.origin);
        wsOrigins.add(`${parsed.protocol === "https:" ? "wss:" : "ws:"}//${parsed.host}`);
      }
    } catch {
      // Ignore malformed env URL when building CSP defaults
    }
  }

  return {
    http: Array.from(httpOrigins).join(" "),
    ws: Array.from(wsOrigins).join(" "),
  };
}

function buildContentSecurityPolicy(): string {
  const supabase = buildSupabaseOrigins();
  const scriptSrc = isProduction
    ? "'self' 'unsafe-inline' https://challenges.cloudflare.com"
    : "'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com";

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    `img-src 'self' data: blob: ${supabase.http}`,
    `connect-src 'self' ${supabase.http} ${supabase.ws} https://challenges.cloudflare.com`,
    "frame-src 'self' https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    allowIframeEmbed
      ? "frame-ancestors 'self' https://aistudio.google.com https://*.google.com https://*.googleusercontent.com"
      : "frame-ancestors 'none'",
  ];

  return directives.join("; ");
}

const nextConfig: NextConfig = {
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    const securityHeaders = [
      { key: "Content-Security-Policy", value: buildContentSecurityPolicy() },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
      ...(allowIframeEmbed ? [] : [{ key: "X-Frame-Options", value: "DENY" }]),
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    ];

    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
};

export default nextConfig;

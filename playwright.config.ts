import { defineConfig } from '@playwright/test';

const hasSupabase = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3100',
    headless: true,
  },
  webServer: {
    command: hasSupabase ? 'npm run start -- --port 3100' : 'npx next dev -p 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      ...process.env,
      ...(hasSupabase
        ? {}
        : {
            NEXT_DIST_DIR: '.next-e2e',
            MOCK_SESSION_SECRET:
              process.env.MOCK_SESSION_SECRET || 'playwright-local-dev-session-secret',
          }),
    },
  },
});

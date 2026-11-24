import { defineConfig } from '@playwright/test';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';
const hasSupabase = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseServiceRoleKey &&
    !supabaseUrl.includes('placeholder.supabase.co') &&
    supabaseAnonKey !== 'placeholder-anon-key'
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
      NODE_ENV: hasSupabase ? 'production' : 'development',
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

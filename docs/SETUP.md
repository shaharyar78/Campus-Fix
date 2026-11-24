# Setup

## Prerequisites

- Node.js 20 or newer
- npm
- A Supabase project
- Optional: Playwright browsers for end-to-end tests

## Installation

```bash
npm ci
cp .env.example .env.local
```

## Environment Variables

Configure at least:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Optional distributed rate limiting (recommended in production):

```text
REDIS_URL=
# Or Upstash REST:
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Use the local `.env.local` file for development. Never commit real credentials.

## Supabase Setup

1. Create or open a Supabase project.
2. Run `supabase/schema.sql`.
3. Run migrations from `supabase/migrations` in order.
4. Apply `supabase/policies.sql`.
5. Configure storage using `supabase/storage.sql`.
6. Optionally run `supabase/seed.sql` in development.

For an existing Supabase project, back it up and apply only migrations that have not already run there. Do not rerun the schema or seed scripts blindly against live data.

The current college migration adds G. L. Bajaj Institute of Technology & Management and enables signup for active colleges. Its configured email domains are `glbitm.ac.in` and `glbitm.org`; confirm these with campus IT before launch. GL Bajaj buildings are not seeded until actual campus locations are confirmed. Until its campus admin configures the directory, students can enter the building name on a report.

## Authentication

Set the production site URL to your deployed origin in Supabase Auth. Add these production redirect URLs to the allow list:

```text
https://YOUR_DOMAIN/auth/callback
https://YOUR_DOMAIN/auth/callback?next=/auth/update-password
```

Keep `http://localhost:3000/auth/callback` in the allow list only if local development still needs it.
For Render, also allow both callback URLs:

```text
https://kcc-campus-fix.onrender.com/auth/callback
https://kcc-campus-fix.onrender.com/auth/callback?next=/auth/update-password
```

**Confirm email must be ON** under **Authentication -> Providers -> Email**; users must verify their address before they can sign in.

### Password reset email

1. **Custom SMTP (Resend)**: Go to **Supabase Dashboard -> Authentication -> SMTP Settings** and enable Custom SMTP (default Supabase SMTP is heavily rate limited and unsuitable for production):
   - Host: `smtp.resend.com`
   - Port: `465`
   - User: `resend`
   - Password: Your Resend API key
   - Sender email: Your verified domain sender address
2. **Site URL**: Go to **Authentication -> URL Configuration** and set **Site URL** to `https://campus-fix-liart.vercel.app` (or whichever is the primary production URL).
3. **Redirect URLs allow-list**: Add each callback URL both with and without `?next=/auth/update-password`:
   ```text
   https://campus-fix-liart.vercel.app/auth/callback
   https://campus-fix-liart.vercel.app/auth/callback?next=/auth/update-password
   https://kcc-campus-fix.onrender.com/auth/callback
   https://kcc-campus-fix.onrender.com/auth/callback?next=/auth/update-password
   http://localhost:3000/auth/callback
   http://localhost:3000/auth/callback?next=/auth/update-password
   ```
4. **Email template**: Ensure the **Reset Password** email template includes `{{ .ConfirmationURL }}`.
5. **Production environment checklist (Vercel and Render)**:
   - Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and server-only `SUPABASE_SERVICE_ROLE_KEY`.
   - Configure either `REDIS_URL` or both `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` for shared rate limits.
   - Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` together when enabling Turnstile.
   - Keep `ALLOW_IFRAME_EMBED=false` and `NEXT_PUBLIC_ALLOW_IFRAME_EMBED=false`.
   - Do not set `MOCK_SESSION_SECRET` in production; it is only for local mock sessions.
   - Keep `SUPABASE_SERVICE_ROLE_KEY` strictly server-side and never expose it to the client.

## Development

```bash
npm run dev
```

Open `http://localhost:3000`.

## Tests

```bash
npm test
npm run test:e2e
npm run lint
npm run build
```

Install Playwright dependencies if end-to-end tests do not start:

```bash
npx playwright install
```

## Production

Deploy from the repository root on a Next.js-compatible host. Use `npm ci` for installation, `npm run build` for the build, and `npm run start` when the host expects a start command. The GitHub Actions workflow runs lint, typecheck, unit tests, a production build, and browser smoke tests on pushes and pull requests to `main`.

Set these environment variables in the hosting provider's server environment:

```text
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
```

The service-role key must remain server-only; never use a `NEXT_PUBLIC_` name for it. Apply database migrations, RLS policies, and storage policies before deploying app code that depends on them. Verify campus email domains before opening registration, and have campus admins configure accurate building directories. Do not run `supabase/seed.sql` in production unless its campus records match the intended production data.

# CampusFix

CampusFix is a multi-college campus maintenance reporting platform. Students report infrastructure issues, administrators triage and resolve them, and super-admins manage colleges and platform-wide operations.

## Features

- College-specific student and administrator accounts
- Issue reporting with location, category, description, and photos
- Duplicate detection with a merge/upvote workflow
- Public tracking IDs and status timelines
- Admin dashboards, filters, building management, and report updates
- Super-admin college management and college switching
- Supabase authentication, storage, and PostgreSQL database
- REST-style API routes implemented with Next.js Route Handlers

## Technology Stack

- Next.js App Router and React
- TypeScript
- Tailwind CSS
- Supabase (Postgres, Auth, Storage)
- Jest or Vitest for unit tests
- Playwright for end-to-end tests

## Getting Started

```bash
npm install
cp .env.example .env.local
```

Add your Supabase project URL and keys to `.env.local`, then start the application:

```bash
npm run dev
```

Open `http://localhost:3000`. Detailed setup steps are in [docs/SETUP.md](docs/SETUP.md).

## Project Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Frontend](docs/FRONTEND.md)
- [Backend](docs/BACKEND.md)
- [API](docs/API.md)
- [Database](docs/DATABASE.md)
- [Security](docs/SECURITY.md)
- [Setup](docs/SETUP.md)
- [Multi-college Isolation](docs/MULTI_COLLEGE.md)

## Scripts

Common scripts to be supplied by `package.json`:

- `npm run dev` - start the development server
- `npm run build` - create a production build
- `npm run lint` - run lint checks
- `npm test` - run unit tests
- `npm run test:e2e` - run Playwright tests

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## License

See [LICENSE](LICENSE).
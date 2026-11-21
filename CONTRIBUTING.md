# Contributing

Thank you for contributing to CampusFix. Keep changes focused, accessible, and consistent with the existing architecture.

## Development Workflow

1. Create a descriptive branch for your change.
2. Install dependencies and copy `.env.example` to `.env.local`.
3. Apply Supabase migrations and seed data in a development project.
4. Implement the smallest complete change.
5. Run relevant unit, integration, and end-to-end tests.
6. Open a pull request using the repository template.

## Code Guidelines

- Use TypeScript and keep public types explicit.
- Prefer server components unless browser state or interaction is required.
- Keep API authorization and college isolation on the server.
- Reuse components and hooks instead of duplicating UI or data-fetching logic.
- Handle loading, empty, error, forbidden, and not-found states.
- Never log secrets or expose service-role credentials.
- Use clear names and avoid unnecessary comments.

## File and Naming Conventions

- React components use PascalCase and `.tsx` files.
- Hooks use `use<Name>.ts`.
- Route Handlers live under `src/app/api/**/route.ts`.
- Shared utilities live under `src/lib`.
- Data contracts live under `src/types`.
- SQL migrations use ISO-style numeric prefixes.

## Database Changes

Database changes require a migration in `supabase/migrations`. Update `supabase/schema.sql`, RLS policies, seed data, and database documentation when the change affects them.

## Testing

Add or update tests for every behavior change:

- Unit tests: `tests/unit`
- End-to-end tests: `tests/e2e`

Run at least the targeted test suite and linting before requesting review.

## Pull Requests

PR descriptions should explain the problem, implementation, test coverage, database changes, security impact, and screenshots for visible UI changes.
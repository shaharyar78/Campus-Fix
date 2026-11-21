# Security

## Authentication

Supabase Auth authenticates users. Server components and Route Handlers must use server-side session validation. Expired or missing sessions must not reach protected operations.

## Authorization

Every protected operation checks:

- Authenticated identity
- Role
- College scope
- Resource ownership where applicable

Do not authorize based only on request parameters or a client-provided role.

## Row Level Security

Supabase RLS is mandatory for college isolation. Policies must cover direct table access and storage access. Test RLS by acting as student, admin, and super-admin identities.

## Environment Secrets

Keep these values only in server or environment configuration:

- Supabase service-role key
- Database credentials
- Third-party API secrets

Never put them in `NEXT_PUBLIC_*` variables or commit them.

## Input Validation

Validate and normalize all API input. Reject oversized text, invalid IDs, unsupported categories, and malformed file types. Revalidate critical authorization and field constraints on the server.

## File Uploads

Limit report photos by size and type. Store uploads outside public paths unless intentionally configured. Generate safe object names and verify ownership before returning or deleting files.

## Duplicate Merging

An upvote must be unique per report and user. Duplicate report creation should use a database-safe mechanism or conflict result rather than a check-only implementation that races.

## Security Headers and CSRF

Configure CSP and recommended Next.js security headers. Mutating operations must use the authenticated session and appropriate request protection.

## Logging

Log operation metadata and request IDs, but never passwords, session tokens, service keys, or full sensitive records.

## Review Checklist

- Verify college isolation on every route.
- Verify RLS for every table and bucket.
- Verify role checks before mutations.
- Verify storage authorization.
- Verify dependency and build security updates.
- Add tests for unauthorized and cross-college requests.
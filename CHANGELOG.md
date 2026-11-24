# Changelog

All notable changes to CampusFix will be documented in this file.

The format follows Keep a Changelog principles and the project uses semantic versioning.

## [Unreleased]

### Security

- Removed the unauthenticated password-reset API route and restored Supabase PKCE email reset flow (`/forgot-password` -> `/auth/callback?next=/auth/update-password` -> `/auth/update-password`).
- Removed `supabase.auth.admin.listUsers()` lookups and auto-confirmation bypasses in favor of direct `profiles` lookups and `admin.createUser()` error mapping.

### Changed

- Standardized password validation (`MIN_PASSWORD_LENGTH = 8`, `validatePassword`) across registration and password updates while keeping login validation non-empty.
- Updated mock Supabase client/server/route parity for `resetPasswordForEmail` (email validation and 429 rate-limit simulation) and `updateUser` password enforcement.
- Removed unused `public/assets/aistudio/` and empty `public/images/` directories, and documented production password reset SMTP/URL setup in `docs/SETUP.md`.

### Added

- Initial CampusFix application structure
- Student reporting, tracking, and chat routes
- Admin report management and building management routes
- Super-admin college management routes
- Duplicate report warning and upvote support
- Supabase authentication, database, storage, and policy structure
- Unit and end-to-end test placeholders
- Architecture and operational documentation
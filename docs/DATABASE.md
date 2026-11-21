# Database

## Platform

CampusFix uses Supabase PostgreSQL. Schema and policies are stored in `supabase/schema.sql`, `supabase/policies.sql`, and `supabase/migrations`.

## Core Tables

### colleges

Stores college identity and configuration, including an optional `email_domain` used for registration.

Typical fields:

- `id`
- `name`
- `slug`
- `created_at`

### profiles

Maps an authenticated Supabase Auth user to CampusFix role and college data.

### buildings

Stores buildings belonging to a college, including a validated `floor_count` from 0 to 25.

### reports

Stores a maintenance report, including category, location, description, status, tracking ID, college, submitter, upvote count, and timestamps.

### report_upvotes

Stores one upvote per student per report. A unique constraint should cover `(report_id, user_id)`.

### report_updates

Stores status changes and progress notes for report timelines.

### messages

Stores chat messages associated with reports or support conversations.

## Required Constraints

- Primary keys use UUID values or database-generated UUID defaults.
- Foreign keys include explicit delete behavior.
- `tracking_id` is unique.
- Report upvotes have a unique report/user pair.
- Status fields use database checks or enumerations.
- College references are required on college-scoped resources.

## Migrations

Apply migrations in ascending numeric order in development and production. The upvote migration is `supabase/migrations/20231120_add_upvotes.sql`.

## Row Level Security

RLS must:

- Restrict students to their own reports and authorized chat interactions.
- Restrict admins to reports and buildings from their college.
- Restrict super-admin operations according to platform policy.
- Prevent user-supplied college IDs from overriding the authenticated profile's college.

Policies are documented and reviewed in `supabase/policies.sql`.
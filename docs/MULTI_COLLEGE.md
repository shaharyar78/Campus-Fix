# Multi-College Isolation

## Tenant Model

Each college is a tenant in the CampusFix platform. College-scoped resources store a `college_id`, and every user's profile identifies their college.

KCC Institute and G. L. Bajaj Institute of Technology & Management (slug `glbitm`) are the initial active campuses. New campuses are added by an approved super-admin; each campus manages its own building list, reports, and administrator approvals.

## Roles

### Student

Students operate in one college and may create, track, upvote, and chat about accessible reports.

### Admin

Admins operate in one college and may manage its buildings and reports.

### Super-admin

Super-admins can manage platform colleges and may have explicit cross-college access according to policy.

## Required Rules

1. Derive a user's college from the server session/profile.
2. Never trust a browser-provided college ID as the sole tenant boundary.
3. Include `college_id` checks in queries and mutations.
4. Enforce identical restrictions with Supabase RLS.
5. Prevent duplicate or upvote records from crossing colleges.
6. Scope analytics and admin counts by college.

## Data Access

College-scoped resources include reports, buildings, updates, chat, and report upvotes.

Before returning a resource, verify that it belongs to the authenticated user's college unless an explicitly authorized super-admin operation permits broader access.

## API Behavior

- Student and admin list endpoints default to the session user's college.
- College-specific routes validate the requested college against permissions.
- Cross-college lookup must return `404` or `403`, never a hidden resource detail.
- Super-admin college creation and updates use a separate privileged path.
- Registration selects an active college and validates its configured email domain.
- A campus without confirmed building data must have its buildings configured by its campus admin before reports can be placed.

## Testing

Add end-to-end coverage for:

- Student cannot read or update another college's report.
- Admin cannot view or modify another college's buildings or reports.
- Student cannot upvote or chat using a cross-college report.
- Super-admin can perform authorized cross-college operations.
- RLS blocks direct Supabase access outside the tenant scope.

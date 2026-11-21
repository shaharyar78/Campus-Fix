# Backend

## Runtime

The backend uses Next.js Route Handlers and Supabase. Route Handlers under `src/app/api` expose JSON endpoints for application features.

## Authentication

Use Supabase Auth as the identity provider. Server code must read the current session through the server Supabase client and never accept a user ID as a substitute for session identity.

## Authorization

Authorization must verify both role and college:

1. Load the authenticated user.
2. Load the user's role and college ID.
3. Verify the operation is allowed for that role.
4. Verify every report, building, or college belongs to the authorized scope.

Row Level Security is an additional required database boundary.

## Supabase Clients

- `src/lib/supabase/client.ts`: browser operations
- `src/lib/supabase/server.ts`: authenticated server operations
- `src/lib/supabase/middleware.ts`: session refresh and route protection

Use the service-role key only in protected server environments. Never import it into client code.

## Route Handler Pattern

1. Authenticate the request.
2. Parse and validate the body or query parameters.
3. Check role and college permissions.
4. Execute the database operation.
5. Return a typed success response or an appropriate error status.

## API Error Responses

Return HTTP statuses that match the result:

- `400`: invalid input
- `401`: unauthenticated
- `403`: insufficient permission
- `404`: resource not found or not visible
- `409`: duplicate or conflicting resource
- `429`: rate limit exceeded
- `500`: unexpected server failure

Error bodies should contain a stable code and a safe message.

## Duplicate and Upvote Operations

Duplicate detection is implemented in `src/lib/deduplication.ts`. The reports route should return `409` with the existing report identifier when a meaningful duplicate is detected. The upvote endpoint must enforce one vote per student per report.
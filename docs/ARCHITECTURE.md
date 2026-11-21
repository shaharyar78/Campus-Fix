# Architecture

## Overview

CampusFix uses Next.js for the web application and API, Supabase for authentication and PostgreSQL, and Tailwind CSS for presentation.

```text
Browser
  -> Next.js App Router
       -> Route Handlers
       -> Supabase server client
       -> PostgreSQL with RLS
       -> Supabase Storage
```

## Application Layers

### Presentation

Pages in `src/app` compose reusable components from `src/components`. Client components should only handle interaction and browser-specific state.

### Hooks and State

Hooks in `src/hooks` fetch and update application data. They should normalize loading and error states and avoid duplicating server-side authorization.

### API

Route Handlers in `src/app/api` validate input, derive identity from the authenticated Supabase session, enforce role and college permissions, and return JSON responses.

### Domain Logic

Shared logic belongs in `src/lib`, including tracking ID generation, duplicate matching, validation, college filtering, and API helpers.

### Data

Supabase PostgreSQL stores reports, colleges, buildings, updates, upvotes, chat, and profiles. Storage holds report photos. Row Level Security remains the final data-access boundary.

## Data Flow

1. The browser sends an authenticated request.
2. Middleware refreshes and verifies the Supabase session where required.
3. A server component or Route Handler loads the user's profile and college.
4. The handler validates request data and college scope.
5. PostgreSQL and RLS enforce the final access rules.
6. The UI renders loading, success, or error feedback.

## Role Model

- **Student:** creates reports, upvotes reports, tracks reports, and sends chat messages.
- **Admin:** manages reports and buildings within one college.
- **Super-admin:** manages colleges and cross-college configuration.

## Report Lifecycle

`submitted` -> `under_review` -> `assigned` -> `in_progress` -> `resolved`

Reports may also use a `rejected` or `closed` state. Every status change should create an update record for the timeline.

## Error Handling

- Use Next.js `error.tsx`, `loading.tsx`, and `not-found.tsx` for route-level states.
- API routes return consistent HTTP statuses and JSON error shapes.
- Never expose database errors or internal identifiers to clients.
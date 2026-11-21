# Frontend

## Framework

The frontend uses Next.js App Router, React, and TypeScript. Server components are preferred for initial data loading; client components should be isolated to interactive UI.

## Directory Layout

- `src/app`: routes and layouts
- `src/components`: reusable UI
- `src/hooks`: browser and React data hooks
- `src/types`: frontend data contracts
- `src/lib`: validation, formatting, and API helpers

## Routes

Student routes cover dashboards, report creation, tracking, and chat. Admin routes cover reports, report details, and buildings. Super-admin routes cover college creation and management.

## Components

Use the base components in `src/components/ui` for controls and layout primitives. Feature components should receive typed props and avoid direct database access.

## Styling

Tailwind CSS is the primary styling system. Tailwind configuration and global styles belong in `tailwind.config.ts` and `src/app/globals.css`.

## State

Use local React state for form interaction and temporary UI state. Use hooks or server data loading for persistent application data. Do not duplicate authoritative server state in the browser.

## Required UX States

Every data screen should cover:

- Loading
- Empty
- Error
- Unauthorized or forbidden
- Success
- Pending mutation

## Forms

- Validate required fields before submission.
- Mirror critical server validation.
- Disable submit controls while a mutation is pending.
- Show field-specific errors and a general request failure fallback.
- Prevent duplicate submissions where practical.

## Accessibility

- Use semantic HTML.
- Provide visible focus styles.
- Associate labels with form controls.
- Use accessible dialog patterns.
- Do not communicate status only by color.
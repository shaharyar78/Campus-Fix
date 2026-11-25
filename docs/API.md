# API

All API routes return JSON.

## Authentication

Protected endpoints require a valid Supabase user session. Missing or expired sessions return `401 Unauthorized`.

## Standard Error Shape

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "A readable safe message"
  }
}
```

## Reports

### `GET /api/reports`

Lists reports visible to the authenticated user and applies optional filters.

Typical query parameters:

- `status`
- `category`
- `building_id`
- `college_id` for a super-admin

### `POST /api/reports`

Creates a report. A duplicate match may return `409` with the existing report:

```json
{
  "error": {
    "code": "DUPLICATE_REPORT",
    "message": "A similar report already exists",
    "existing_report_id": "uuid"
  }
}
```

### `GET /api/reports/[id]`

Gets report details when the report is in the user's college scope.

### `PATCH /api/reports/[id]`

Updates report fields allowed for an admin.

### `POST /api/reports/[id]/updates`

Adds a status update or timeline entry.

### `POST /api/reports/[id]/upvote`

Adds or removes the authenticated student's upvote, depending on endpoint implementation. It must not create a duplicate vote.

## Colleges

### `GET /api/colleges`

Lists colleges visible to the authenticated role.

### `POST /api/colleges`

Creates a college. Requires super-admin permission.

## Buildings

### `GET /api/buildings`

Lists buildings in the authenticated user's college.

### `POST /api/buildings`

Creates a building. Requires admin or super-admin permission.

## Chat

### `GET /api/chat`

Lists chat messages for an authorized report or chat context.

### `POST /api/chat`

Posts a message after validating college and report access.

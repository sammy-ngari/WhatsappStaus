# WhatsApp Campaign Manager

Production-oriented backend/frontend application for a governed campaign execution platform, built on an inherited Prisma + PostgreSQL schema.

## Current Scope

Phase 1 (Identity & RBAC Hardening) is implemented with no Prisma schema changes.

Implemented:

1. HttpOnly cookie-based auth transport
2. Access token verification middleware with server-side session binding
3. Refresh token rotation with replay detection and session revocation
4. RBAC permission resolver (`users` -> `roles` -> `permissions` with `modules` + `tabs`)
5. Route-level authorization middleware (`authorize(module, tab, action)`)
6. Protected API route example
7. Client-side auth and permission guards backed by server-provided permission descriptors

## Architecture Summary

### Authentication

1. `POST /auth/login`
- Validates credentials
- Issues access + refresh JWT pair
- Stores token hashes in `sessions`
- Sets HttpOnly cookies only (tokens are not returned in response JSON)

2. `POST /auth/refresh`
- Reads refresh token from cookie
- Verifies signature and token type
- Rotates refresh/access tokens (one-time refresh semantics)
- Invalidates session on replay detection

3. `POST /auth/logout`
- Revokes session by refresh-token hash
- Clears auth cookies

4. `GET /auth/me`
- Requires authenticated access token
- Returns current authenticated profile from trusted server context

### Authorization (RBAC)

1. `hasPermission(userId, moduleName, tabName, action)`:
- Resolves user + `role_id`
- Resolves module by `modules.title`
- Resolves tab by `tabs.title` + module scope
- Checks `permissions` for role/module/tab/action
- Returns `boolean`

2. `authorize(moduleName, tabName, action)` middleware:
- Returns `401` when unauthenticated
- Returns `403` when authenticated but unauthorized
- Attaches authorization context to request on success

3. Protected endpoint example:
- `GET /api/campaigns/overview`
- Guard chain: `authenticateAccessToken` + `authorize("Campaigns", "Overview", "read")`

### Client Guarding

1. App bootstraps identity from `GET /auth/me`
2. Permissions are loaded from `GET /auth/permissions`
3. Route guards:
- `RequireAuth`
- `RequirePermission(module, tab, action)`
4. Unauthorized screens redirect to `/unauthorized`
5. Client guarding is UX-only; server middleware remains authoritative

## Repository Layout

```text
.
|-- backend/
|   |-- controllers/
|   |-- middleware/
|   |-- prisma/
|   |-- routes/
|   |-- utils/
|   |-- validation/
|   |-- .env.example
|   |-- index.js
|   |-- prisma.js
|   `-- package.json
|-- frontend/
|   |-- public/
|   |-- src/
|   |   |-- api/
|   |   |-- context/
|   |   `-- pages/
|   |-- .env.example
|   `-- package.json
`-- README.md
```

## Environment Variables

Backend (`backend/.env`):

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `ACCESS_TOKEN_SECRET` | Yes | JWT secret for access tokens |
| `REFRESH_TOKEN_SECRET` | Yes | JWT secret for refresh tokens |
| `ACCESS_TOKEN_TTL_MINUTES` | No | Access token lifetime (default: `15`) |
| `REFRESH_TOKEN_TTL_DAYS` | No | Refresh token lifetime (default: `7`) |
| `AUTH_COOKIE_SAME_SITE` | No | `strict`, `lax`, or `none` (default: `lax`) |
| `ACCESS_TOKEN_COOKIE_NAME` | No | Access token cookie name (default: `access_token`) |
| `REFRESH_TOKEN_COOKIE_NAME` | No | Refresh token cookie name (default: `refresh_token`) |
| `PORT` | No | API port (default: `3000`) |
| `CORS_ORIGIN` | No | Comma-separated allowed origins |

Important:

1. In production, cookies are marked `Secure` and `HttpOnly`
2. If `AUTH_COOKIE_SAME_SITE=none`, HTTPS is required
3. `.env` files must never be committed

Frontend (`frontend/.env`):

| Variable | Required | Description |
|---|---|---|
| `REACT_APP_API_URL` | Yes | Backend URL (for example `http://localhost:3000`) |

## API Reference (Auth + Security)

Base URL: `http://localhost:3000`

### `POST /auth/login`

Request body:

```json
{
  "email": "user@example.com",
  "password": "StrongPass123"
}
```

Success response:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "role_id": "1"
    },
    "accessTokenExpiresAt": "2026-03-03T12:00:00.000Z",
    "refreshTokenExpiresAt": "2026-03-10T11:45:00.000Z"
  }
}
```

### `POST /auth/refresh`

Uses refresh token from HttpOnly cookie.

Success response:

```json
{
  "success": true,
  "message": "Session refreshed successfully",
  "data": {
    "accessTokenExpiresAt": "2026-03-03T12:15:00.000Z",
    "refreshTokenExpiresAt": "2026-03-10T12:00:00.000Z"
  }
}
```

### `POST /auth/logout`

Revokes the current refresh session and clears auth cookies.

### `GET /auth/me`

Returns current authenticated user (requires access token cookie).

### `GET /auth/permissions`

Returns normalized permission descriptors:

```json
{
  "success": true,
  "data": {
    "permissions": [
      {
        "moduleName": "Campaigns",
        "tabName": "Overview",
        "action": "read"
      }
    ]
  }
}
```

### `GET /api/campaigns/overview`

Protected route requiring:

1. Authenticated access token
2. RBAC permission: `Campaigns` / `Overview` / `read`

## Security Posture Notes

1. Token storage:
- Browser-accessible storage is avoided for auth tokens
- Token hashes (not plaintext JWTs) are persisted server-side

2. Rotation and replay:
- Refresh tokens are one-time-use via rotation
- Replay/mismatch invalidates session to limit attacker reuse

3. Error handling:
- API errors avoid leaking secrets or internal implementation details
- Security events are logged with structured metadata only

4. Separation of concerns:
- `tokenService`: signing/verifying/hashing/TTL
- `sessionService`: session persistence/invalidation/rotation
- `authenticateAccessToken`: authentication
- `authorize`: authorization
- `permissionService`: RBAC resolution

## Local Setup

1. Install backend dependencies:

```bash
cd backend
npm install
npm run prisma:generate
```

2. Install frontend dependencies:

```bash
cd ../frontend
npm install
```

3. Run backend:

```bash
cd ../backend
npm run start
```

4. Run frontend:

```bash
cd ../frontend
npm run start
```

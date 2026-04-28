# Learnings: infra

## Codebase Patterns
- The server is a plain Node.js Express app. `npm run build` compiles TypeScript to `dist/`, `npm start` runs `dist/http.js`. No bundler.
- Required environment variables: `ATLASSIAN_CLIENT_ID`, `ATLASSIAN_CLIENT_SECRET`, `PUBLIC_URL`. `PORT` defaults to 3000.
- `GET /health` returns `{ status: "ok", version: "0.1.0" }` — use this for health checks in deployment config.
- Token storage is currently in-memory (`Map` in `src/auth/tokens.ts`). Production deployment must replace this with a persistent store (Redis or Postgres) — tokens must survive restarts or every user gets logged out on deploy.

## Gotchas
- `PUBLIC_URL` must match the OAuth app's registered redirect URI exactly (including trailing slash or lack thereof). Mismatch causes `redirect_uri_mismatch` errors from Atlassian.
- The Atlassian OAuth app must be registered at developer.atlassian.com with the callback URL set to `${PUBLIC_URL}/auth/callback`.
- `npm run dev` uses `tsx watch` for hot reload — suitable for local development only.

## Preferences
- (none yet)

## Cross-Agent Notes
- (none yet)

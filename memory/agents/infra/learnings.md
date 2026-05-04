# Learnings: infra

## Codebase Patterns
- The server is a plain Node.js Express app. `npm run build` compiles TypeScript to `dist/`, `npm start` runs `dist/http.js`. No bundler.
- Required environment variables: `ATLASSIAN_CLIENT_ID`, `ATLASSIAN_CLIENT_SECRET`, `PUBLIC_URL`. `PORT` defaults to 3000.
- `GET /health` returns `{ status: "ok", version: "0.1.0" }` — use this for health checks in deployment config.
- Token storage is now pluggable via `src/auth/token-store.ts`. Set `TOKEN_STORE=redis` and `REDIS_URL` for production. Default is `memory` (in-process Map). (added: 2026-04-27, dispatch: moth-meg.11)
- `src/config.ts` uses `as const` at the top level. New fields that hold a narrowed union type need an explicit cast, e.g. `(process.env.TOKEN_STORE ?? "memory") as "memory" | "redis"`. TypeScript won't infer the union from a plain env var read inside an `as const` object. (added: 2026-04-27, dispatch: moth-meg.11)

## Gotchas
- `PUBLIC_URL` must match the OAuth app's registered redirect URI exactly (including trailing slash or lack thereof). Mismatch causes `redirect_uri_mismatch` errors from Atlassian.
- The Atlassian OAuth app must be registered at developer.atlassian.com with the callback URL set to `${PUBLIC_URL}/auth/callback`.
- `npm run dev` uses `tsx watch` for hot reload — suitable for local development only.
- `ioredis` with `lazyConnect: true` defers the TCP connection until the first command — the server starts cleanly even if Redis is not yet reachable at boot. Errors surface via the `error` event, not at construction time. (added: 2026-04-27, dispatch: moth-meg.11)
- When making synchronous store functions async, grep for all callers across `src/` before running typecheck. In the current codebase, `oauth.ts` is the only external caller of `saveTokens`/`deleteTokens`. (added: 2026-04-27, dispatch: moth-meg.11)

## Preferences
- (none yet)

## Cross-Agent Notes
- (none yet)

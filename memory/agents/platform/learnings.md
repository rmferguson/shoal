# Learnings: platform

## Codebase Patterns
- `src/config.ts` exports a single `config` object. All environment variables are read here — never call `process.env` directly in other files.
- OAuth session state (CSRF nonce) is stored in a module-level `Map` in `src/auth/oauth.ts`. Token storage is a separate `Map` in `src/auth/tokens.ts`. Both are in-memory for dev; production needs a persistent store.
- `getValidTokens(sessionId)` in `src/auth/tokens.ts` is the single entry point for getting a valid access token — it auto-refreshes if expired. `JiraClient` calls this internally; tools never handle tokens directly.
- The MCP endpoint (`POST /mcp`) creates a new `McpServer` and `StreamableHTTPServerTransport` per request — stateless HTTP pattern. This is intentional.

## Gotchas
- RFC 9728 `/.well-known/oauth-protected-resource` must stay in place. Removing it breaks auth in Cursor, VS Code, and Gemini CLI (#148). It is not redundant.
- The OAuth callback validates `state` against `sessionId` to prevent CSRF. The state format is `${sessionId}:${nonce}`. Do not simplify this.
- `AbortSignal.timeout()` is used for all fetch calls (Node 22 built-in). Do not replace with a manual timeout wrapper.
- Token refresh uses `refresh_token` grant. Atlassian may return a new `refresh_token` in the response — always update the stored value if present, don't assume it's stable.

## Preferences
- (none yet)

## Cross-Agent Notes
- (none yet)

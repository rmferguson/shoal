# Learnings: implementer

## Codebase Patterns
- All tools follow the same shape: Zod input schema exported as `XxxInput`, async function exported with the tool name, returns `unknown`. Registered in `src/server.ts` via `server.tool()`.
- `JiraClient` in `src/jira/client.ts` wraps all Jira API calls. Use it for every tool — never call `fetch` directly. It handles bearer token auth, timeout, and error normalization.
- ADF (Atlassian Document Format) is required for all write operations (descriptions, comments). Plain text bodies are rejected or cause @mentions to be stripped. Always wrap with `{ type: "doc", version: 1, content: [{ type: "paragraph", content: [{ type: "text", text }] }] }`.
- Custom fields are returned alongside standard fields under `customfield_*` keys. Never filter them out — story points (`customfield_10016`) being silently absent was the original Atlassian bug (#119).

## Gotchas
- `createJiraIssue` must be a single POST with no retry. The Atlassian double-create bug (#132) was caused by a retry/double-invocation pattern. Do not add retry logic to issue creation.
- Components must be serialized as `[{ name: "..." }]` objects, not plain strings. Plain strings cause "Please provide Component" errors (#95).
- `getJiraIssue` fetches with `?expand=renderedFields` to get all field data. Include this on any new read tools that need full field content.
- Request timeout is 10s via `AbortSignal.timeout()`. On `AbortError`, surface a clear message with a hint to use `rawAdf: true` or equivalent opt-out.
- Pagination: always return `total`, `startAt`, `maxResults`, `returned`, and `nextStartAt` (null when no more pages). The Atlassian server never returned these (#118).

## Preferences
- (none yet)

## Cross-Agent Notes
- (none yet)

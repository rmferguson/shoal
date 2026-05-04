# Learnings: implementer

## Codebase Patterns
- All tools follow the same shape: Zod input schema exported as `XxxInput`, async function exported with the tool name, returns `unknown`. Registered in `src/server.ts` via `server.tool()`.
- `JiraClient` in `src/jira/client.ts` wraps all Jira API calls. Use it for every tool — never call `fetch` directly. It handles bearer token auth, timeout, and error normalization.
- ADF (Atlassian Document Format) is required for all write operations (descriptions, comments). Plain text bodies are rejected or cause @mentions to be stripped. Always wrap with `{ type: "doc", version: 1, content: [{ type: "paragraph", content: [{ type: "text", text }] }] }`.
- Custom fields are returned alongside standard fields under `customfield_*` keys. Never filter them out — story points (`customfield_10016`) being silently absent was the original Atlassian bug (#119).
- Pagination pattern: always return `total`, `startAt`, `maxResults`, `returned`, and `nextStartAt`. Compute: `nextStartAt = startAt + returned < total ? startAt + returned : null`.

## Gotchas
- `createJiraIssue` must be a single POST with no retry. The Atlassian double-create bug (#132) was caused by a retry/double-invocation pattern. Do not add retry logic to issue creation.
- Components must be serialized as `[{ name: "..." }]` objects, not plain strings. Plain strings cause "Please provide Component" errors (#95).
- `getJiraIssue` fetches with `?expand=renderedFields` to get all field data. Include this on any new read tools that need full field content.
- Request timeout is 10s via `AbortSignal.timeout()`. On `AbortError`, surface a clear message with a hint to use `rawAdf: true` or equivalent opt-out.
- ADF mention nodes require `attrs: { id: accountId, text: "@DisplayName", accessLevel: "APPLICATION" }`. The `accessLevel` field is required — mentions silently degrade without it. (added: 2026-04-27, dispatch: moth-meg.2)
- `/project/search` returns results under `values`, not `issues` — different shape from the issue search endpoint `/search/jql`. (added: 2026-04-27, dispatch: moth-meg.3)
- The `clearResolution` pattern for transitions uses `update.resolution = [{ set: null }]` in the POST /transitions body. This is NOT the same as `fields.resolution = null` in PUT /issue/{key}. Do not confuse the two. (added: 2026-04-27, dispatch: moth-meg.4)
- Empty `fields: {}` in PUT /issue/{key} is a valid no-op request — Jira returns 204. Callers should validate at least one field is provided before calling `updateJiraIssue`. (added: 2026-04-27, dispatch: moth-meg.5)
- `manageJiraIssueLabels` uses the Jira `update` syntax: `{ update: { labels: [{ add: "x" }, { remove: "y" }] } }` — build the ops array by iterating `add[]` and `remove[]` separately before the call. (added: 2026-04-27, dispatch: moth-meg.7)
- When a Zod schema uses `.refine()` (or `.superRefine()`, `.transform()`), the result is `ZodEffects` which has no `.shape` property. For `server.tool()` registration, export the inner `ZodObject`'s `.shape` separately (e.g. `ManageLabelsInputShape = ManageLabelsBase.shape`) and use it for registration while still calling `ManageLabelsInput.parse()` in the handler to enforce the refinement. (added: 2026-04-27, dispatch: moth-meg.7)

## Preferences
- `z.number().optional().default(N)` and `z.boolean().optional().default(false)` after `.parse()` are always present — no manual fallback needed in the function body.

## Cross-Agent Notes
- (none yet)

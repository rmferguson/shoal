# Learnings: backend

## Codebase Patterns
- A "shortcut tool" pattern now exists alongside base CRUD tools — `createJiraEpic`/`assignIssueToEpic` (added 2026-07-08) are thin, self-contained wrappers around the same `/issue` endpoints `createJiraIssue`/`updateJiraIssue` use, built because agents kept guessing a dedicated epic tool existed. For future "shortcut for a common but non-obvious param combo" requests: own `JiraClient` calls directly, don't delegate to the general tool (added: 2026-07-08, dispatch: implement-epic-shortcuts)
- Jira tools live in `src/tools/*.ts`; GitHub tools live in `src/tools/github/*.ts`
- JiraClient in `src/jira/client.ts` uses Basic Auth via env vars and a 10s AbortSignal timeout on all requests
- All writes to Jira (comments, descriptions) must use ADF (`doc > paragraph > text`) — plain strings are rejected or strip @mentions (#136)
- Components are serialized as `[{ name: "..." }]` objects, not plain strings (#95)

## Gotchas
- `getJiraIssue` surfaces a `rawAdf: true` hint when the 10s timeout fires on media-heavy ADF issues (#145)
- `getJiraIssue` and `searchJiraIssuesUsingJql` must never filter out `customfield_*` values — full field passthrough is required
- Jira's `POST /rest/api/3/issueLink` returns `201 Created` with an empty body, not `204 No Content` — don't assume 204 is the only "no body" status Jira uses; the old `status === 204` check masked this bug for the endpoint's entire lifetime (added: 2026-07-04, dispatch: implement-issuelink-empty-body)

- `assignIssueToEpic`'s legacy-classic-project fallback (`fields.parent` rejected → retry with `customfield_10014`) is untested against a real legacy Jira instance. Detection heuristic: `err instanceof JiraError && err.status === 400 && /\bparent\b/i.test(err.body)`. Best-effort match against Jira's typical field-error wording, not a guarantee (added: 2026-07-08, dispatch: implement-epic-shortcuts)

## Preferences
- When several test-file mocks need both `json()` and `text()` on the same response body, extract a small `jsonResponse(body, status, ok)` helper at the top of the test file rather than duplicating both fields per mock (added: 2026-07-04, dispatch: implement-issuelink-empty-body)

## Codebase Patterns (GitHub)
- `src/github/config.ts` uses a named `REQUEST_TIMEOUT_MS` constant and a `buildConfig(token)` helper — both `getGitHubConfig` and `tryGetGitHubConfig` delegate to it (added: 2026-06-27, dispatch: sprint-github-refactor)
- `GitHubClient` callers are the 6 tool files under `src/tools/github/`, not `src/github/server.ts` — `server.ts` only registers tools, it does not instantiate the client (added: 2026-06-27, dispatch: sprint-github-refactor)
- `src/github/server.ts` uses a `registerTool<TInput>` helper with structural typing for the schema param — pass the ZodObject directly; the helper calls `.shape` and `.parse` internally (added: 2026-06-27, dispatch: sprint-github-refactor)
- MCP tool name strings in `src/github/server.ts` use `GitHub` casing (e.g. `listGitHubIssues`); TypeScript function names in `src/tools/github/*.ts` still use `Github` casing — intentionally separate namespaces (added: 2026-06-27, dispatch: sprint-github-refactor)

## Codebase Patterns (Jira internals)
- `src/jira/config.ts` now uses `REQUEST_TIMEOUT_MS` constant and a private `buildConfig(siteUrl, email, apiToken)` helper — same pattern as `src/github/config.ts` (added: 2026-06-27, dispatch: sprint-jira-internals)
- `src/jira/client.ts` uses a private `checkResponse(response, path)` method shared by `request()` and `upload()` to throw `JiraError` on non-OK status — `upload()` has no 204 guard (attachments always return a body) (added: 2026-06-27, dispatch: sprint-jira-internals)
- `JiraClient.request<T>()` reads the body via `response.text()` first, then `JSON.parse()`s only if non-empty — not `response.json()` directly. Any test mock stubbing `fetch` for `get()`/`post()`/`put()` must define `text()` (or both `json()` and `text()`), or it throws `response.text is not a function`. `upload()` is unaffected — still calls `response.json()` directly (added: 2026-07-04, dispatch: implement-issuelink-empty-body)

## Server Wiring
- `registerTool<TInput>` helper in `src/jira/server.ts` matches `src/github/server.ts` exactly — schema param uses structural typing `{ shape: Record<string, ZodTypeAny>; parse(input: unknown): TInput }`. For ZodEffects (refined schemas like `ManageLabelsInput`), pass `{ shape: ManageLabelsInputShape, parse: (args: unknown) => ManageLabelsInput.parse(args) }` inline (added: 2026-06-27, dispatch: sprint-jira-server)
- `JiraClient` is instantiated once in `registerJiraTools()` after `tryGetJiraConfig()` succeeds and passed as a second param to all 14 tool functions — tests add `const client = new JiraClient()` at module level (no mocking needed because `setup.ts` sets env vars) (added: 2026-06-27, dispatch: sprint-jira-server)
- `getJiraIssueLinkTypes` still exports `GetIssueLinkTypesInput` (`z.object({})`) and is registered with `registerTool` using `_input` since it takes no meaningful args — harmless (added: 2026-06-27, dispatch: sprint-jira-server)

## Error Handling Architecture
- `src/tools/errors.ts` is now protocol-agnostic (AbortError only); `src/jira/errors.ts` wraps it and adds JiraError handling — all Jira tools import `toToolError` from `../jira/errors.js` (added: 2026-06-27, dispatch: sprint-misc-cleanup)
- Stage files only after ALL edits to that file are complete to avoid bundling unrelated changes into one commit (added: 2026-06-27, dispatch: sprint-misc-cleanup)

## GitHub Error Handling
- `handleGitHubError` lives in `src/tools/github/errors.ts` and always returns `{ error, status, body }` — three tools previously omitted `body`; the shape is now uniform (added: 2026-06-27, dispatch: sprint-github-coupling)
- GitHub tool functions take `client: GitHubClient` as their first parameter; `src/github/server.ts` instantiates one `GitHubClient` per `registerGithubTools()` call (added: 2026-06-27, dispatch: sprint-github-coupling)
- GitHub Zod schemas use camelCase param names (`issueNumber`, `perPage`) matching Jira conventions; `URLSearchParams` keys remain snake_case (`per_page`, `issue_number`) to satisfy the GitHub REST API (added: 2026-06-27, dispatch: sprint-github-coupling)

## Cross-Agent Notes
- `createJiraEpic` (`src/tools/create-epic.ts`) params: `projectKey`, `summary`, `epicName?`, `description?`, `assigneeAccountId?`, `priority?`, `labels?`, `components?`, `customFields?` — no `parent` param (epics have no parent epic). `assignIssueToEpic` (`src/tools/assign-to-epic.ts`) params: `issueKey`, `epicKey` only; response includes `via: "parent" | "customfield_10014"` showing which field was actually used — the tool's main value-add signal (added: 2026-07-08, dispatch: implement-epic-shortcuts, for_agent: technical-writer)
- No unassign/remove-from-epic tool was added alongside `createJiraEpic`/`assignIssueToEpic` — explicitly out of scope for that dispatch, not an oversight (added: 2026-07-08, dispatch: implement-epic-shortcuts, for_agent: tester)

# Learnings: backend

## Codebase Patterns
- Jira tools live in `src/tools/*.ts`; GitHub tools live in `src/tools/github/*.ts`
- JiraClient in `src/jira/client.ts` uses Basic Auth via env vars and a 10s AbortSignal timeout on all requests
- All writes to Jira (comments, descriptions) must use ADF (`doc > paragraph > text`) — plain strings are rejected or strip @mentions (#136)
- Components are serialized as `[{ name: "..." }]` objects, not plain strings (#95)

## Gotchas
- `getJiraIssue` surfaces a `rawAdf: true` hint when the 10s timeout fires on media-heavy ADF issues (#145)
- `getJiraIssue` and `searchJiraIssuesUsingJql` must never filter out `customfield_*` values — full field passthrough is required

## Preferences
- (none yet)

## Codebase Patterns (GitHub)
- `src/github/config.ts` uses a named `REQUEST_TIMEOUT_MS` constant and a `buildConfig(token)` helper — both `getGitHubConfig` and `tryGetGitHubConfig` delegate to it (added: 2026-06-27, dispatch: sprint-github-refactor)
- `GitHubClient` callers are the 6 tool files under `src/tools/github/`, not `src/github/server.ts` — `server.ts` only registers tools, it does not instantiate the client (added: 2026-06-27, dispatch: sprint-github-refactor)
- `src/github/server.ts` uses a `registerTool<TInput>` helper with structural typing for the schema param — pass the ZodObject directly; the helper calls `.shape` and `.parse` internally (added: 2026-06-27, dispatch: sprint-github-refactor)
- MCP tool name strings in `src/github/server.ts` use `GitHub` casing (e.g. `listGitHubIssues`); TypeScript function names in `src/tools/github/*.ts` still use `Github` casing — intentionally separate namespaces (added: 2026-06-27, dispatch: sprint-github-refactor)

## Codebase Patterns (Jira internals)
- `src/jira/config.ts` now uses `REQUEST_TIMEOUT_MS` constant and a private `buildConfig(siteUrl, email, apiToken)` helper — same pattern as `src/github/config.ts` (added: 2026-06-27, dispatch: sprint-jira-internals)
- `src/jira/client.ts` uses a private `checkResponse(response, path)` method shared by `request()` and `upload()` to throw `JiraError` on non-OK status — `upload()` has no 204 guard (attachments always return a body) (added: 2026-06-27, dispatch: sprint-jira-internals)

## Cross-Agent Notes
- (none yet)

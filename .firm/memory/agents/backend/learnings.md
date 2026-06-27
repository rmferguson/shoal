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

## Cross-Agent Notes
- (none yet)

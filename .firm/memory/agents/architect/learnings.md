# Learnings: architect

## Codebase Patterns
- Project has two independent providers: Jira (Atlassian REST API v3) and GitHub Issues, each with their own client, config, and server files under `src/jira/` and `src/github/`
- Entry points are split: `src/index.ts` (combined), `src/index-jira.ts`, `src/index-github.ts`
- The spec (`shoal-jira-spec.md`) is the authoritative design reference for Jira behavior

## Gotchas
- The old team.yaml described a hosted server with deploy infra (Dockerfile, auth layer, HTTP routing) — that vision was abandoned; the project is local stdio only
- `createJiraIssue` must never use retry logic — Atlassian's double-create bug (#132) is caused by double-invocation

## Preferences
- (none yet)

## Cross-Agent Notes
- (none yet)

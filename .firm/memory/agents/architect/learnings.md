# Learnings: architect

## Codebase Patterns
- Project is Jira-only (Atlassian REST API v3); a GitHub Issues provider was built and reverted (2026-06-30) — do not reintroduce `src/github/` without an explicit decision to re-add that provider
- Single entry point: `src/index.ts`, single bin command `shoal`
- The spec (`shoal-jira-spec.md`) is the authoritative design reference for Jira behavior

## Gotchas
- The old team.yaml described a hosted server with deploy infra (Dockerfile, auth layer, HTTP routing) — that vision was abandoned; the project is local stdio only
- `createJiraIssue` must never use retry logic — Atlassian's double-create bug (#132) is caused by double-invocation

## Preferences
- (none yet)

## Cross-Agent Notes
- (none yet)

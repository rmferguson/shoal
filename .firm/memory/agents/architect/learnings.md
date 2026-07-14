# Learnings: architect

## Codebase Patterns
- Project is Jira-only (Atlassian REST API v3); a GitHub Issues provider was built and reverted (2026-06-30) — do not reintroduce `src/github/` without an explicit decision to re-add that provider
- Single entry point: `src/index.ts`, single bin command `shoal`
- The spec (`shoal-jira-spec.md`) is the authoritative design reference for Jira behavior

## Gotchas
- The old team.yaml described a hosted server with deploy infra (Dockerfile, auth layer, HTTP routing) — that vision was abandoned; the project is local stdio only
- `createJiraIssue` must never use retry logic — Atlassian's double-create bug (#132) is caused by double-invocation
- CLAUDE.md's `## Project layout` tree orders `src/tools/` entries by registration order in `src/jira/server.ts`, not alphabetically, and only lists registered MCP tools — non-tool helper modules (`adf-utils.ts`, `errors.ts`, `issue-fields.ts`, `issue-type-hints.ts`, `pagination.ts`) are intentionally omitted, not a gap (added: 2026-07-14, dispatch: implement-subtask-type-hints)
- A worktree can have a stray untracked `node_modules/` that `git check-ignore` reports as not ignored (no matching gitignore rule in that worktree) — stage explicit paths (`git add CLAUDE.md`), not `git add -A`, to avoid accidentally committing it (added: 2026-07-14, dispatch: implement-subtask-type-hints)

## Preferences
- (none yet)

## Cross-Agent Notes
- (none yet)

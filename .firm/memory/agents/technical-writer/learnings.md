# Learnings: technical-writer

## Codebase Patterns
- `docs/jira-api.md`'s "Issue links vs parent" section is the right home for cross-tool workflow notes that span two tools (e.g. create + link) — it already distinguishes issue links from parent relationships, so a "how do these two tools compose" note belongs there rather than in either tool's individual `docs/tools.md` entry, which stays a single-tool parameter reference (added: 2026-07-09, dispatch: implement-jira-dependency-docs)
- README targets users configuring the MCP server in their AI client (Claude, Cursor, etc.)
- CHANGELOG follows a release-per-section format; current version is 1.0.0 (not 0.2.0 — stale, corrected 2026-07-08)
- `docs/` directory exists but is sparse — room to grow
- `docs/tools.md` is the full parameter-reference doc README links to, separate from topic docs like `docs/jira-epics.md` — check it whenever a new tool ships, every registered tool needs a `## \`toolName\`` section there or README's "full parameter coverage" promise is broken (added: 2026-07-08, dispatch: implement-epic-shortcuts)
- `docs/tools.md`'s tool-section ordering follows registration order in `src/jira/server.ts`, not alphabetical or file-creation order — check that file when deciding where a new tool's doc section belongs (added: 2026-07-08, dispatch: implement-epic-shortcuts)

## Gotchas
- Shoal is positioned as the quality alternative to Atlassian's official MCP server (`mcp.atlassian.com`), which has correctness bugs; docs should emphasize this distinction
- Two separate server modes exist (combined, Jira-only, GitHub-only) — config examples must cover all three
- A worktree's files are separate copies from the main checkout, not symlinked — resolve paths relative to the worktree cwd; the Edit tool rejects writes to the shared-checkout path from inside a worktree dispatch (added: 2026-07-08, dispatch: implement-epic-shortcuts)

## Preferences
- CHANGELOG.md had no `[Unreleased]` section precedent before 2026-07-08; add one above the latest version per Keep a Changelog convention rather than guessing a new version number — versioning isn't a docs decision (added: 2026-07-08, dispatch: implement-epic-shortcuts)

## Cross-Agent Notes
- CLAUDE.md's project layout list under `src/tools/` does not include `create-issue-link.ts` or `get-issue-link-types.ts` (both exist and are registered in `src/jira/server.ts`, both documented in `docs/tools.md`) — stale list, worth a follow-up sync next time that file is touched (added: 2026-07-09, dispatch: implement-jira-dependency-docs, for_agent: backend)
- (from backend) `createJiraEpic` (`src/tools/create-epic.ts`) params: `projectKey`, `summary`, `epicName?`, `description?`, `assigneeAccountId?`, `priority?`, `labels?`, `components?`, `customFields?` — no `parent` param (epics have no parent epic). `assignIssueToEpic` (`src/tools/assign-to-epic.ts`) params: `issueKey`, `epicKey` only; response includes `via: "parent" | "customfield_10014"` showing which field was actually used — the tool's main value-add signal, worth documenting (added: 2026-07-08, dispatch: implement-epic-shortcuts)

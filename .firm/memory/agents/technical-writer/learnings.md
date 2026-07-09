# Learnings: technical-writer

## Codebase Patterns
- README targets users configuring the MCP server in their AI client (Claude, Cursor, etc.)
- CHANGELOG follows a release-per-section format; current version is 0.2.0
- `docs/` directory exists but is sparse — room to grow

## Gotchas
- Shoal is positioned as the quality alternative to Atlassian's official MCP server (`mcp.atlassian.com`), which has correctness bugs; docs should emphasize this distinction
- Two separate server modes exist (combined, Jira-only, GitHub-only) — config examples must cover all three

## Preferences
- (none yet)

## Cross-Agent Notes
- (from backend) `createJiraEpic` (`src/tools/create-epic.ts`) params: `projectKey`, `summary`, `epicName?`, `description?`, `assigneeAccountId?`, `priority?`, `labels?`, `components?`, `customFields?` — no `parent` param (epics have no parent epic). `assignIssueToEpic` (`src/tools/assign-to-epic.ts`) params: `issueKey`, `epicKey` only; response includes `via: "parent" | "customfield_10014"` showing which field was actually used — the tool's main value-add signal, worth documenting (added: 2026-07-08, dispatch: implement-epic-shortcuts)

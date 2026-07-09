# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added — Jira tools

- `createJiraEpic` — shortcut for creating an epic without needing to know `issueType: "Epic"` or the `customfield_10011` epic-name mapping
- `assignIssueToEpic` — shortcut for assigning an issue to an epic; tries the `parent` field and falls back to `customfield_10014` for legacy classic projects automatically

## [1.0.0] - 2026-07-02

### Added — Jira tools

- `getJiraIssue` — fetch a single issue with full field passthrough (custom fields, story points, etc.)
- `searchJiraIssuesUsingJql` — JQL search with cursor-based pagination via `nextPageToken`
- `createJiraIssue` — single-POST issue creation (no duplicate-create bug)
- `updateJiraIssue` — update fields on an existing issue
- `getJiraTransitions` — list available workflow transitions for an issue
- `transitionJiraIssue` — move an issue through its workflow; supports `clearResolution` on reopen
- `addCommentToJiraIssue` — add a comment using ADF (preserves @mentions)
- `getJiraIssueComments` — fetch comments on an issue with pagination
- `editJiraIssueComment` — edit an existing comment
- `manageJiraIssueLabels` — add, remove, or replace labels on an issue
- `addAttachmentToJiraIssue` — upload a file attachment
- `getJiraIssueLinkTypes` — list available issue link types
- `createJiraIssueLink` — link two issues together
- `getJiraProjects` — list accessible Jira projects

### Fixed — Atlassian official server bugs

- **#132** `createJiraIssue` double-creates every ticket — fixed with a single POST, no retry loop
- **#119** Custom fields silently absent from `getJiraIssue` and search responses — fixed with full field passthrough
- **#118** JQL pagination broken, `nextPageToken` never returned — fixed with cursor-based pagination
- **#145** `getJiraIssue` hangs indefinitely on media-heavy ADF issues — fixed with 10s timeout and `rawAdf` fallback hint
- **#95** Components rejected on issue create — fixed with correct `[{ name: "..." }]` object serialization
- **#88** No `getJiraIssueComments` tool — included
- **#85** Resolution not cleared when reopening issues via `transitionJiraIssue` — fixed with `clearResolution` flag
- **#140** No comment editing — `editJiraIssueComment` included
- **#83** No label management — `manageJiraIssueLabels` included
- **#136** `@mentions` stripped from comments — fixed with ADF mention nodes

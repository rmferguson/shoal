# Drive State

**Plan**: moth-jira-spec.md
**Started**: 2026-04-25
**Sprint count**: 0

## Completed Areas
(none yet)

## Current Sprint Focus
Sprint 1: Project bootstrap + OAuth foundation

## Remaining Areas
- Project bootstrap: TypeScript project, folder structure, HTTP server
- OAuth 2.0 3LO: consent flow, callback, token storage, refresh, RFC 9728 endpoint
- Core Jira tools: getJiraIssue, searchJiraIssuesUsingJql, createJiraIssue (with custom fields)
- Remaining Jira tools: updateJiraIssue, transitionJiraIssue, addCommentToJiraIssue, getJiraProjects, getJiraTransitions
- Missing tools: getJiraIssueComments, addAttachmentToJiraIssue, editJiraIssueComment, getJiraDevPanel, manageJiraIssueLabels
- Hosting: deploy, production token storage, multi-client verification
- Billing: Stripe integration
- Distribution: marketplace plugin configs for Claude Code, Cursor, Gemini CLI

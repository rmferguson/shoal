# Atlassian MCP Server — Known Issues

These are bugs in `mcp.atlassian.com` that Shoal fixes or explicitly does not address. Do not reintroduce them.

| Issue | Description | Status in Shoal |
|-------|-------------|----------------|
| #132 | createJiraIssue double-creates every ticket | Fixed |
| #119 | Custom fields silently absent from responses | Fixed |
| #118 | JQL pagination broken, no nextPageToken | Fixed |
| #145 | getJiraIssue hangs on media-heavy ADF | Fixed (timeout + rawAdf flag) |
| #95 | Component handling broken on create | Fixed |
| #88 | No getJiraIssueComments tool | Fixed |
| #85 | Can't clear Resolution on reopen | Fixed (clearResolution flag) |
| #140 | No comment editing | Fixed |
| #83 | No label management | Fixed |
| #136 | @mentions stripped in comments | Fixed (ADF mention nodes) |
| #148 | OAuth discovery missing RFC 9728 | N/A (local stdio, no OAuth) |
| #138 | No dev panel (linked PRs/branches) | N/A (requires non-Jira app links) |

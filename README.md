# Shoal — Jira MCP Server

A local MCP server for Jira that works correctly. Built as a quality alternative to Atlassian's official server, which has unfixed bugs in issue creation, pagination, custom fields, and comment handling.

## What's fixed

| Atlassian bug | Shoal |
|---------------|-------|
| `createJiraIssue` creates two identical tickets on every call | Single POST, no duplicates |
| Custom fields (story points, etc.) silently absent from responses | Full field passthrough |
| JQL pagination never returns a next page cursor | Cursor-based pagination via `nextPageToken` |
| `getJiraIssue` hangs indefinitely on media-heavy issues | 10s timeout + `rawAdf` fallback |
| `transitionJiraIssue` fails when reopening issues (Resolution not cleared) | `clearResolution` flag |
| Components rejected on issue create | Correct object serialization |
| `@mentions` stripped from comments | ADF mention nodes |
| No `getJiraIssueComments` tool | Included |
| No `editJiraIssueComment` tool | Included |
| No `manageJiraIssueLabels` tool | Included |
| No issue link tools | `createJiraIssueLink` + `getJiraIssueLinkTypes` |
| Epic operations require knowing Jira's internal field model (`customfield_10011`, `customfield_10014`) | `createJiraEpic` + `assignIssueToEpic` |

## Tools

### Jira

`getJiraIssue`, `searchJiraIssuesUsingJql`, `getJiraIssueTypes`, `createJiraIssue`, `updateJiraIssue`, `getJiraTransitions`, `transitionJiraIssue`, `addCommentToJiraIssue`, `getJiraIssueComments`, `editJiraIssueComment`, `manageJiraIssueLabels`, `addAttachmentToJiraIssue`, `getJiraIssueLinkTypes`, `createJiraIssueLink`, `getJiraProjects`, `createJiraEpic`, `assignIssueToEpic`.

Full parameter reference: [docs/tools.md](docs/tools.md)

---

## Documentation

- [docs/tools.md](docs/tools.md) — full tool reference with all parameters and return values
- [docs/jira-epics.md](docs/jira-epics.md) — epic model: classic vs next-gen projects, field differences
- [docs/jira-fields.md](docs/jira-fields.md) — common custom fields, ADF format, account IDs
- [docs/jira-api.md](docs/jira-api.md) — Jira API quirks, search endpoint changes, pagination, gotchas

---

## Requirements

- Node.js 22+
- An Atlassian API token — generate one at [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)

## Setup

#### Claude Code

Add to your MCP config (`.claude/mcp.json` or via `claude mcp add`):

```json
{
  "mcpServers": {
    "shoal": {
      "command": "npx",
      "args": ["-y", "@aquarium-tools/shoal"],
      "env": {
        "JIRA_SITE_URL": "https://yourorg.atlassian.net",
        "ATLASSIAN_USER_EMAIL": "you@example.com",
        "ATLASSIAN_API_TOKEN": "your-token-here"
      }
    }
  }
}
```

#### Other MCP clients

Use the same config format with the appropriate client's MCP server section.

#### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JIRA_SITE_URL` | Yes | Your Jira instance URL, e.g. `https://yourorg.atlassian.net` |
| `ATLASSIAN_USER_EMAIL` | Yes | Email address for your Atlassian account |
| `ATLASSIAN_API_TOKEN` | Yes | API token from id.atlassian.com |

## Running from source

```bash
npm install
npm run dev        # run directly from source with tsx
npm run build      # compile to dist/
npm start          # run compiled server
npm test           # run test suite
npm run typecheck  # type-check without building
```

## License

Apache 2.0 — see [LICENSE](LICENSE).

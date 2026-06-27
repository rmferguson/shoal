# Shoal — Jira MCP Server

Shoal is an open-source local MCP server for Jira. It is positioned as the quality alternative to Atlassian's official server (`mcp.atlassian.com`), which has unfixed correctness bugs and auth fragility across AI clients.

**Full spec:** `shoal-jira-spec.md`

---

## What it is

- Local stdio MCP server — users configure it in their MCP client as a command
- Auth via Atlassian API token (env vars) — no OAuth flow, no hosted server
- Built against Jira Cloud REST API v3
- TypeScript / Node.js, open source

## What it is not

- Not a hosted multi-tenant service
- Not a remote HTTP/SSE server
- Not Confluence or Bitbucket (v1 is Jira only)

---

## Stack

| Layer | Choice |
|-------|--------|
| Runtime | Node.js 22 |
| Language | TypeScript (strict) |
| MCP | `@modelcontextprotocol/sdk` — `McpServer` + `StdioServerTransport` |
| Validation | Zod |
| Auth | Atlassian API token (Basic Auth via env vars) |

---

## Project layout

```
src/
  config.ts          # Environment config (JIRA_SITE_URL, ATLASSIAN_USER_EMAIL, ATLASSIAN_API_TOKEN)
  index.ts           # Entry point — stdio transport
  server.ts          # McpServer — tool registration
  jira/
    client.ts        # JiraClient — Basic Auth fetch wrapper, upload support
  tools/
    get-issue.ts     # getJiraIssue
    search-issues.ts # searchJiraIssuesUsingJql
    create-issue.ts  # createJiraIssue
    get-transitions.ts   # getJiraTransitions
    add-comment.ts       # addCommentToJiraIssue
    get-projects.ts      # getJiraProjects
    transition-issue.ts  # transitionJiraIssue
    update-issue.ts      # updateJiraIssue
    edit-comment.ts      # editJiraIssueComment
    manage-labels.ts     # manageJiraIssueLabels
    add-attachment.ts    # addAttachmentToJiraIssue
    get-comments.ts      # getJiraIssueComments
```

---

## Key design decisions

**Single POST for issue creation** — `createJiraIssue` makes exactly one POST with no retry loop. The Atlassian server's double-create bug (#132) is caused by a double-invocation pattern. Do not add retry logic to issue creation.

**Full field passthrough** — `getJiraIssue` and `searchJiraIssuesUsingJql` never filter out custom fields. Story points and other `customfield_*` values are always returned. Do not add a field allowlist.

**Request timeout** — `JiraClient` sets a 10s timeout on all requests via `AbortSignal.timeout()`. This prevents the indefinite hang on media-heavy ADF issues (#145). The `getJiraIssue` tool surfaces a clear error with a `rawAdf: true` hint when it fires.

**Component serialization** — components are serialized as `[{ name: "..." }]` objects, not plain strings. This is the fix for #95. Do not simplify to plain strings.

**ADF for comments/descriptions** — when writing to Jira (comments, descriptions), always wrap plain text in ADF (`doc > paragraph > text`). Plain string bodies are rejected or cause @mentions to be stripped (#136).

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JIRA_SITE_URL` | Yes | Your Jira instance URL, e.g. `https://yourorg.atlassian.net` |
| `ATLASSIAN_USER_EMAIL` | Yes | Email address for your Atlassian account |
| `ATLASSIAN_API_TOKEN` | Yes | API token from id.atlassian.com/manage-profile/security/api-tokens |

---

## Running locally

```bash
npm install
npm run dev          # tsx — run directly from source
npm run typecheck    # tsc --noEmit
npm run build        # compile to dist/
npm start            # run compiled server
```

### MCP client config

```json
{
  "mcpServers": {
    "shoal": {
      "command": "node",
      "args": ["/path/to/shoal/dist/index.js"],
      "env": {
        "JIRA_SITE_URL": "https://yourorg.atlassian.net",
        "ATLASSIAN_USER_EMAIL": "you@example.com",
        "ATLASSIAN_API_TOKEN": "your-token-here"
      }
    }
  }
}
```

---

## Issue tracker

This project uses **bd** (beads) for issue tracking. All work is under the `moth-meg` epic.

```bash
bd children moth-meg     # See all remaining work
bd ready                 # See what's available to pick up
bd show <id>             # View issue details
bd close <id>            # Complete work
```

Do not use TodoWrite, TaskCreate, or markdown TODO lists. Use `bd` only.

---

## Atlassian server bugs

See `ISSUES.md` for the full list of bugs fixed in Shoal vs. `mcp.atlassian.com`.

---

## Project Context

- Stack: TypeScript / Node.js 22, @modelcontextprotocol/sdk, Zod, Vitest
- Tracker: GitHub Issues (https://github.com/rmferguson/shoal/issues)
- JSON tool: jq

# Moth — Jira MCP Server

Moth is a hosted MCP server for Jira. It is positioned as the quality alternative to Atlassian's official server (`mcp.atlassian.com`), which has unfixed correctness bugs and auth fragility across AI clients.

**Full spec:** `moth-jira-spec.md`

---

## What it is

- Remote HTTP/SSE MCP server — users paste a URL into their MCP client config
- Multi-tenant OAuth 2.0 3LO — each user authorizes against their own Atlassian org
- Built against Jira Cloud REST API v3
- TypeScript / Node.js

## What it is not

- Not a fork — the Atlassian repo is config only, no source
- Not a local stdio tool
- Not Confluence or Bitbucket (v1 is Jira only)

---

## Stack

| Layer | Choice |
|-------|--------|
| Runtime | Node.js 22 |
| Language | TypeScript (strict) |
| MCP | `@modelcontextprotocol/sdk` — `McpServer` + `StreamableHTTPServerTransport` |
| HTTP | Express 4 |
| Validation | Zod |
| Auth | OAuth 2.0 3LO via `auth.atlassian.com` |

---

## Project layout

```
src/
  config.ts          # Environment config (PUBLIC_URL, PORT, ATLASSIAN_CLIENT_*)
  http.ts            # Express server — MCP endpoint, OAuth routes, health check
  server.ts          # McpServer — tool registration
  auth/
    oauth.ts         # /auth/login + /auth/callback (consent flow)
    tokens.ts        # Token storage + refresh (in-memory for dev, DB for prod)
    well-known.ts    # /.well-known/oauth-protected-resource (RFC 9728)
  jira/
    client.ts        # JiraClient — authenticated fetch wrapper, upload support
  tools/
    get-issue.ts     # getJiraIssue
    search-issues.ts # searchJiraIssuesUsingJql
    create-issue.ts  # createJiraIssue
    (more tools added here as sprint progresses)
```

---

## Key design decisions

**RFC 9728 resource metadata** — `/.well-known/oauth-protected-resource` is implemented. This is what fixes auth fragility across Cursor, VS Code, and Gemini CLI. Do not remove it.

**Single POST for issue creation** — `createJiraIssue` makes exactly one POST with no retry loop. The Atlassian server's double-create bug (#132) is caused by a double-invocation pattern. Do not add retry logic to issue creation.

**Full field passthrough** — `getJiraIssue` and `searchJiraIssuesUsingJql` never filter out custom fields. Story points and other `customfield_*` values are always returned. Do not add a field allowlist.

**Request timeout** — `JiraClient` sets a 10s timeout on all requests via `AbortSignal.timeout()`. This prevents the indefinite hang on media-heavy ADF issues (#145). The `getJiraIssue` tool surfaces a clear error with a `rawAdf: true` hint when it fires.

**Component serialization** — components are serialized as `[{ name: "..." }]` objects, not plain strings. This is the fix for #95. Do not simplify to plain strings.

**ADF for comments/descriptions** — when writing to Jira (comments, descriptions), always wrap plain text in ADF (`doc > paragraph > text`). Plain string bodies are rejected or cause @mentions to be stripped (#136).

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ATLASSIAN_CLIENT_ID` | Yes (OAuth) | OAuth app client ID from developer.atlassian.com |
| `ATLASSIAN_CLIENT_SECRET` | Yes (OAuth) | OAuth app client secret |
| `PUBLIC_URL` | Yes (prod) | Public base URL, e.g. `https://moth.yourdomain.com` |
| `PORT` | No | HTTP port (default: 3000) |

For local dev without OAuth, the headless API token fallback (not yet implemented) will use `ATLASSIAN_USER_EMAIL` and `ATLASSIAN_API_TOKEN`.

---

## Running locally

```bash
npm install
npm run dev          # tsx watch — hot reload
npm run typecheck    # tsc --noEmit
npm run build        # compile to dist/
npm start            # run compiled server
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

## Known bugs in the Atlassian server (our differentiation)

These are fixed in moth or are on the backlog. Do not reintroduce them:

| Issue | Description | Status in moth |
|-------|-------------|----------------|
| #132 | createJiraIssue double-creates every ticket | Fixed |
| #119 | Custom fields silently absent from responses | Fixed |
| #118 | JQL pagination broken, no nextPageToken | Fixed |
| #145 | getJiraIssue hangs on media-heavy ADF | Fixed (timeout + rawAdf flag) |
| #95 | Component handling broken on create | Fixed |
| #148 | OAuth discovery missing RFC 9728 | Fixed |
| #88 | No getJiraIssueComments tool | Backlog: moth-meg.9 |
| #85 | Can't clear Resolution on reopen | Backlog: moth-meg.4 |
| #140 | No comment editing | Backlog: moth-meg.6 |
| #138 | No dev panel (linked PRs/branches) | Backlog: moth-meg.10 |
| #83 | No label management | Backlog: moth-meg.7 |
| #136 | @mentions stripped in comments | Fix with ADF in addCommentToJiraIssue |

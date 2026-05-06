# Moth — Jira MCP Server Spec

**Codename:** moth (aquatic rename pending)
**Status:** Pre-build planning

---

## What it is

A hosted MCP server for Jira that works correctly across all major AI clients. Built from scratch against the Jira Cloud REST API v3. Positioned as the quality alternative to Atlassian's official server (`mcp.atlassian.com`), which has unfixed correctness bugs and auth fragility across clients.

## What it is not

- Not a fork — `atlassian/atlassian-mcp-server` is config pointing to a closed hosted server. No source to fork.
- Not a local tool — remote HTTP/SSE transport, users paste a URL into their MCP client config.
- Not Confluence or Bitbucket (v1). Post-v1 roadmap: Confluence read-only → Confluence write → Bitbucket.

---

## Stack

- **Runtime:** Node.js
- **MCP layer:** `@modelcontextprotocol/sdk` (TypeScript)
- **Transport:** HTTP/SSE (remote hosted server)
- **Auth:** OAuth 2.0 3LO (multi-tenant), RFC 9728 resource metadata for client discovery
- **API:** Jira Cloud REST API v3

### From `atlassian/atlassian-mcp-server` (reference only, no code)
- `.claude-plugin/`, `.cursor-plugin/`, `gemini-extension.json` — exact marketplace submission format for each AI client
- `skills/` — prompt templates showing how to frame Jira context; useful for writing tool descriptions that agents actually use well
- README auth docs — OAuth 3LO flow description

---

## Auth

Multi-tenant OAuth 2.0 3LO. Each user authorizes moth against their Atlassian org; moth stores and refreshes tokens.

**This is the hardest single piece and the clearest differentiator.** The official server's auth breaks differently in Cursor, VS Code, and Gemini CLI because it does not implement RFC 9728 `resource_metadata` for OAuth discovery (#148). A clean implementation following the spec avoids all of this.

Requirements:
- Browser-based OAuth consent flow
- Token storage per user/org
- Automatic refresh on expiry
- RFC 9728 `/.well-known/oauth-protected-resource` endpoint
- Headless API token fallback (for CI/non-browser environments)

---

## V1 Tools

### Fix what's broken in the official server

**`createJiraIssue`**
- Official server creates two identical tickets milliseconds apart on every call (#132)
- Likely a double-invocation in their request pipeline
- Fix: standard idempotent POST to `/rest/api/3/issue`

**`searchJiraIssuesUsingJql`**
- Pagination never returns `nextPageToken` or total count (#118)
- Fix: use `/search/jql` with cursor-based pagination (`nextPageToken` / `isLast`); always send `fields: ["*navigable"]` to get field data (new endpoint has no implicit default)

**`getJiraIssue` / `searchJiraIssuesUsingJql`**
- Custom fields including story points (`customfield_10016`) silently absent from all responses (#119)
- Fix: include `fields` parameter or return full field map; don't silently drop unknown fields
- Hangs indefinitely on issues with media-heavy ADF content (#145)
- Fix: timeout + opt-out parameter for ADF rendering; return raw ADF if rendering fails

**`transitionJiraIssue`**
- Cannot clear Resolution field on reopen (#85), causing transition errors
- Fix: explicitly null out Resolution when transitioning to open states

**`createJiraIssue` (component handling)**
- Rejects valid component values with "Please provide Component" (#95)
- Fix: correctly serialize component objects in the request body

### Add what's missing

**`getJiraIssueComments`** (#88, labeled "bug" by Atlassian — they know it's a gap)
- Returns paginated list of comments for an issue
- Include: author, body, created, updated

**`addAttachmentToJiraIssue`** (#125, #63)
- Upload a file as an attachment to an issue
- Multipart form POST to `/rest/api/3/issue/{issueKey}/attachments`

**`editJiraIssueComment`** (#140)
- Update the body of an existing comment

**`getJiraDevPanel`** (#138)
- Return linked PRs, branches, and commits for an issue
- Calls Jira's development information API
- Works regardless of whether the SCM is Bitbucket or GitHub

**`manageJiraIssueLabels`** (#83)
- Add, remove, or set labels on an issue

### Core tools (working correctly)

These exist in the official server but need to be re-implemented cleanly:

- `getJiraIssue` — fetch issue by key, full field passthrough including custom fields
- `searchJiraIssuesUsingJql` — JQL search with working pagination
- `createJiraIssue` — create issue, no double-create
- `updateJiraIssue` — update fields
- `transitionJiraIssue` — move through workflow states
- `addCommentToJiraIssue` — add a comment (with proper ADF handling so @mentions work; #136)
- `getJiraProjects` — list accessible projects
- `getJiraTransitions` — list available transitions for an issue

---

## Distribution

Each AI client has a specific config format. From the Atlassian repo:

- **Claude Code** — `.claude-plugin/` directory with manifest JSON
- **Cursor** — `.cursor-plugin/` directory with manifest JSON  
- **Gemini CLI** — `gemini-extension.json`
- **VS Code / Copilot** — separate manifest format (#103 suggests this isn't done yet in the official server — opportunity)

Users who don't use a marketplace client get a URL to paste into their MCP config.

---

## Build sequence

**Week 1 — OAuth + basic tools, local**
- OAuth 2.0 3LO flow working end-to-end
- RFC 9728 resource metadata endpoint
- `getJiraIssue`, `searchJiraIssuesUsingJql`, `createJiraIssue` working correctly against real Jira instance
- Custom fields passing through

**Week 2 — Hosted, multi-client**
- Deploy to hosting (Railway, Fly.io, or similar)
- Verified working in Claude Code and Cursor
- Token storage and refresh working in production

**Week 3 — Polish + remaining tools + billing**
- Add missing tools: comments, attachments, dev panel, labels, comment editing
- Fix transition/resolution bug
- Billing integration (Stripe or similar)
- Error messages that help users fix auth problems

**Week 4 — Marketplace submission + launch**
- Submit to Claude Code, Cursor, Gemini CLI marketplaces
- Copy plugin config formats from Atlassian repo
- Launch post

---

## API contract notes

### POST /rest/api/3/search/jql

The classic `POST /rest/api/3/search` endpoint returns **410 Gone** as of 2025/2026 — it has been removed. All JQL searches must use the newer endpoint.

**Differences from the classic endpoint:**

| | Classic `/search` | New `/search/jql` |
|---|---|---|
| Pagination | `startAt` offset in body | `nextPageToken` cursor in body |
| End-of-results signal | `startAt + returned >= total` | `isLast: true` in response |
| Default fields | `*navigable` (implicit) | None — must pass `fields: ["*navigable"]` explicitly or issues come back with no field data |
| `maxResults` in response | Yes | No |
| `total` in response | Yes | No |

**Required `fields` default:** If `fields` is omitted from the request body, the endpoint returns issue objects with only `id`, `key`, and `self` — no `fields` sub-object. Always pass `fields: ["*navigable"]` as the default to match the old endpoint's behaviour.

**Issue object structure:** Field data is still nested under a `fields` key per issue, same as the classic endpoint. This is consistent with `IssueBean` across all v3 endpoints.

**Pagination:** The response includes `isLast: boolean`. When `isLast` is `false`, a `nextPageToken` string is also present. Pass it as `nextPageToken` in the next request body to advance the page.

**Sources:**
- [Community: `/search/jql` is a complete disaster (pagination bugs)](https://community.atlassian.com/forums/Jira-questions/REST-The-new-rest-api-3-search-jql-endpoint-is-a-complete/qaq-p/3101716)
- [Community: REST v3 search returns 200 with empty data](https://community.atlassian.com/forums/Jira-questions/Advanced-JIRA-search-from-REST-v3-returns-200-code-with-empty/qaq-p/3102909)
- [Developer community: `/search/jql` not returning results](https://community.developer.atlassian.com/t/rest-api-3-search-jql-isnt-returning-results-i-know-my-jql-should-do/94630)
- [Developer community: Inconsistency between response and schema definition](https://community.developer.atlassian.com/t/inconsistency-between-the-response-and-the-schema-definition/89818)

---

## Reference

**Atlassian issue tracker references:** #54, #59, #83, #85, #88, #95, #106, #118, #119, #125, #132, #136, #138, #140, #145, #148

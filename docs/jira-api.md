# Jira Cloud API — Notes and Gotchas

Jira's REST API documentation is incomplete and sometimes wrong. This document covers the gaps and behavioral quirks discovered through production use.

---

## Search endpoint

### The classic endpoint is gone

`POST /rest/api/3/search` returns **410 Gone**. It has been removed. All JQL searches must use the newer endpoint:

```
POST /rest/api/3/search/jql
```

### Differences from the classic endpoint

| | Classic `/search` | New `/search/jql` |
|---|---|---|
| Pagination | `startAt` offset | `nextPageToken` cursor |
| End-of-results signal | `startAt + returned >= total` | `isLast: true` in response |
| Default fields returned | `*navigable` (implicit) | None — must pass explicitly |
| `total` in response | Yes | No |
| `maxResults` in response | Yes | No |

### `fields` is required

If you omit `fields` from the request body, the endpoint returns issue objects with only `id`, `key`, and `self` — no field data at all. Always pass `fields: ["*navigable"]` to match the old endpoint's default behavior.

### Pagination

The response includes `isLast: boolean`. When `isLast` is `false`, a `nextPageToken` string is also present. Pass it back in the next request body to advance the page. There is no total count.

---

## Issue creation

### One POST, no retries

The Atlassian MCP server creates two identical tickets on every call (#132). The cause is a double-invocation pattern in their request pipeline. The fix is straightforward: a single `POST /rest/api/3/issue` with no retry logic. Do not add retry or idempotency logic to issue creation — it creates duplicates.

### Component serialization

Components must be sent as objects, not strings:

```json
{ "components": [{ "name": "Backend" }, { "name": "Auth" }] }
```

Sending `["Backend", "Auth"]` returns a 400 with "Please provide Component" (#95).

---

## Transitions

### Getting valid transition IDs

Transition IDs are not stable across projects or instances. Always call `GET /rest/api/3/issue/{key}/transitions` (via `getJiraTransitions`) to get the valid IDs for a specific issue before transitioning it.

### Clearing Resolution on reopen

When transitioning an issue back to an open state (e.g. "Reopen", "To Do"), Jira may reject the transition if the issue has a Resolution value set. The fix is to explicitly null out Resolution in the transition payload:

```json
{
  "transition": { "id": "21" },
  "fields": { "resolution": null }
}
```

Use `clearResolution: true` on `transitionJiraIssue` and Shoal handles this automatically.

---

## Timeouts on media-heavy issues

Issues with embedded images, video, or other binary attachments in their ADF description can take 30–60 seconds to render, causing client-side timeouts. Shoal sets a 10-second timeout on all requests.

If `getJiraIssue` returns a timeout error, retry with `rawAdf: true`. This returns the raw ADF JSON instead of rendered plain text, bypassing the rendering step.

---

## ADF for write operations

The Jira API requires ADF (Atlassian Document Format) for all description and comment write operations. Sending a plain string returns a 400. See `jira-fields.md` for ADF structure details.

---

## Rate limiting

Jira Cloud rate-limits the REST API. The limits are not publicly documented, but in practice:
- Sustained bursts of ~10 req/s are generally safe
- Bulk operations (many creates/updates in a loop) should include brief pauses
- Rate limit responses return HTTP 429 with a `Retry-After` header

---

## Authentication

Jira Cloud uses HTTP Basic Auth with an API token, not a password:

```
Authorization: Basic base64(email:api_token)
```

API tokens are generated at `id.atlassian.com/manage-profile/security/api-tokens`. They are per-user and have no expiry by default (admins can configure expiry). Treat them as passwords.

The `X-Atlassian-Token: no-check` header is required for multipart uploads (file attachments) — without it, CSRF protection rejects the request.

---

## Issue links vs parent

Jira has two different ways to relate issues:

**Issue links** (via `createJiraIssueLink`) are directional semantic relationships: "PROJ-1 blocks PROJ-2", "PROJ-3 relates to PROJ-4". These appear in the "Linked Issues" section of an issue. Link types are configured per instance.

**Parent** (`parent: { key }`) is a structural hierarchy: a child issue nested inside a parent epic. This is the relationship you want for epics. See `jira-epics.md` for details.

These are different API calls and different data models. Do not use issue links to model epic relationships.

### Empty body on link creation

`POST /rest/api/3/issueLink` returns **201 Created with an empty response body** — not 204, and not a JSON payload. This is documented Atlassian behavior: "this resource returns nothing on the creation of an issue link." A client that gates empty-body handling on `status === 204` will call `JSON.parse("")` on the 201 response and throw `SyntaxError: Unexpected end of JSON input` on every successful link creation. `JiraClient.request<T>()` (`src/jira/client.ts`) now checks actual body length via `response.text()` instead of the status code, so this is handled — but any new direct-fetch code against this endpoint needs the same guard. To confirm a link was actually created, re-fetch the issue with `?fields=issuelinks` — the create response carries no ID to check.

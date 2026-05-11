# Shoal — Tool Reference

All tools communicate with the Jira Cloud REST API v3 using Basic Auth (API token). Configure via environment variables — see the README for setup.

---

## `getJiraIssue`

Fetch a single issue by key. Returns all fields including custom fields — story points, sprints, and any other `customfield_*` values are never filtered out.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `issueKey` | Yes | Issue key, e.g. `PROJ-123` |
| `rawAdf` | No | Return raw ADF JSON for the description instead of rendering it as plain text. Use this for issues that time out due to heavy embedded media. |

**Returns:** `key`, `summary`, `status`, `assignee`, `reporter`, `priority`, `issueType`, `labels`, `description`, `customFields` (all `customfield_*` values as a map).

---

## `searchJiraIssuesUsingJql`

Search issues using JQL with cursor-based pagination.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `jql` | Yes | JQL query, e.g. `project = PROJ AND status = "In Progress"` |
| `maxResults` | No | Results per page, 1–100 (default: 25) |
| `nextPageToken` | No | Cursor from a previous response to fetch the next page |
| `fields` | No | Fields to return. Defaults to all navigable fields including custom fields. |

**Returns:** `returned`, `isLast`, `nextPageToken` (null when on the last page), `issues[]` — each with `key`, `summary`, `status`, `assignee`, `priority`, `issueType`, and `customFields`.

---

## `createJiraIssue`

Create an issue. Makes exactly one API call — no retry logic that could cause duplicates.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `projectKey` | Yes | Project key, e.g. `PROJ` |
| `summary` | Yes | Issue title |
| `issueType` | No | Issue type name (default: `Task`). Pass `Epic` to create an epic. |
| `description` | No | Plain text description — wrapped in ADF automatically |
| `assigneeAccountId` | No | Atlassian account ID of the assignee |
| `priority` | No | Priority name, e.g. `High`, `Medium`, `Low` |
| `labels` | No | Array of label strings |
| `components` | No | Array of component names |
| `parent` | No | Parent issue key to nest this issue under an epic, e.g. `PROJ-10`. Works for next-gen projects and classic projects using the parent link model. |
| `epicName` | No | Epic short label (classic projects only) — separate from `summary`, shown on the epic chip. Set when `issueType` is `Epic` on a classic project. |
| `customFields` | No | Map of custom field values, e.g. `{ "customfield_10016": 5 }` for story points |

**Returns:** `key`, `id`, `url`.

---

## `updateJiraIssue`

Update fields on an existing issue. Only the fields you provide are changed — omitted fields are left untouched.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `issueKey` | Yes | Issue key, e.g. `PROJ-123` |
| `summary` | No | New title |
| `description` | No | New description (plain text, auto-wrapped in ADF) |
| `priority` | No | Priority name |
| `assigneeAccountId` | No | Atlassian account ID; pass empty string `""` to unassign |
| `labels` | No | Full replacement label set |
| `components` | No | Full replacement component set (by name) |
| `parent` | No | Parent issue key — assign or change the epic for this issue, e.g. `PROJ-10`. |
| `customFields` | No | Custom field values, e.g. `{ "customfield_10016": 8 }` |

**Returns:** `{ success: true, issueKey }`.

---

## `getJiraTransitions`

List the workflow transitions available for an issue. Call this before `transitionJiraIssue` to get valid transition IDs.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `issueKey` | Yes | Issue key, e.g. `PROJ-123` |

**Returns:** `issueKey`, `transitions[]` — each with `id`, `name`, and `to` (target status name and category).

---

## `transitionJiraIssue`

Move an issue to a new workflow state using a transition ID from `getJiraTransitions`.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `issueKey` | Yes | Issue key, e.g. `PROJ-123` |
| `transitionId` | Yes | Transition ID from `getJiraTransitions` |
| `clearResolution` | No | Set to `true` when reopening an issue to clear the Resolution field and prevent transition errors |

**Returns:** `{ success: true, issueKey }`.

---

## `addCommentToJiraIssue`

Add a comment to an issue. Supports `@mentions` via proper ADF mention nodes — the Atlassian server downgrades these to plain text.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `issueKey` | Yes | Issue key, e.g. `PROJ-123` |
| `body` | Yes | Comment text |
| `mentions` | No | Array of `{ accountId, displayName }` — users to @mention in the comment |

**Returns:** `id`, `created`, `author`.

---

## `getJiraIssueComments`

Fetch paginated comments for an issue. Comment bodies are returned as plain text rendered from ADF.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `issueKey` | Yes | Issue key, e.g. `PROJ-123` |
| `startAt` | No | Pagination offset (default: 0) |
| `maxResults` | No | Comments per page, max 100 (default: 25) |

**Returns:** `total`, `startAt`, `returned`, `nextStartAt` (null on last page), `comments[]` — each with `id`, `author`, `created`, `updated`, `body`.

---

## `editJiraIssueComment`

Replace the body of an existing comment.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `issueKey` | Yes | Issue key, e.g. `PROJ-123` |
| `commentId` | Yes | Comment ID (from `getJiraIssueComments`) |
| `body` | Yes | New comment text |

**Returns:** `id`, `updated`, `author`.

---

## `manageJiraIssueLabels`

Add or remove labels without needing to supply the full current label set. At least one of `add` or `remove` must be provided.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `issueKey` | Yes | Issue key, e.g. `PROJ-123` |
| `add` | No | Labels to add |
| `remove` | No | Labels to remove |

**Returns:** `{ success: true, issueKey }`.

---

## `addAttachmentToJiraIssue`

Upload a file attachment to an issue.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `issueKey` | Yes | Issue key, e.g. `PROJ-123` |
| `filename` | Yes | Name of the file |
| `content` | Yes | Base64-encoded file content |
| `mimeType` | No | MIME type (default: `application/octet-stream`) |

**Returns:** Array of `{ id, filename, size, mimeType, created }`.

---

## `getJiraIssueLinkTypes`

List all issue link types configured in the Jira instance. Call this before `createJiraIssueLink` to discover valid type names (e.g. `Blocks`, `Relates`, `Duplicate`) and their directional labels.

| Parameter | Required | Description |
|-----------|----------|-------------|
| *(none)* | — | — |

**Returns:** `linkTypes[]` — each with `id`, `name`, `inward` (label for the inward issue), `outward` (label for the outward issue).

---

## `createJiraIssueLink`

Create a directional link between two issues (e.g. "PROJ-1 blocks PROJ-2"). Call `getJiraIssueLinkTypes` first to find valid type names for your instance.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `linkType` | Yes | Link type name, e.g. `Blocks`, `Relates`, `Duplicate` |
| `inwardIssueKey` | Yes | Issue key for the inward side (e.g. the issue that "is blocked by" the outward issue) |
| `outwardIssueKey` | Yes | Issue key for the outward side (e.g. the issue that "blocks" the inward issue) |
| `comment` | No | Optional comment to add alongside the link |

**Returns:** `{ success: true, inwardIssueKey, outwardIssueKey, linkType }`.

---

## `getJiraProjects`

List accessible Jira projects with pagination.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `startAt` | No | Pagination offset (default: 0) |
| `maxResults` | No | Projects per page, max 100 (default: 50) |

**Returns:** `total`, `startAt`, `returned`, `nextStartAt` (null on last page), `projects[]` — each with `id`, `key`, `name`, `projectTypeKey`, `style`.

# Jira Fields Reference

## Custom fields

Jira stores most non-standard fields as `customfield_NNNNN`. The IDs are **instance-specific** — the number for story points on one Jira instance may differ from another. The IDs below are the most common defaults, but always verify against your instance using `getJiraIssue` and inspecting the `customFields` map in the response.

| Field name | Common ID | Type | Notes |
|------------|-----------|------|-------|
| Story Points | `customfield_10016` (classic) / `customfield_10028` (next-gen) | Number | Varies — `10016` is the most common default for classic projects |
| Sprint | `customfield_10020` | Array of sprint objects | Returns `[{ id, name, state, startDate, endDate }]` |
| Epic Name | `customfield_10011` | String | Classic projects only — the short chip label, separate from `summary` |
| Epic Link | `customfield_10014` | Issue key string | Legacy classic projects — links a child to its parent epic |
| Flagged | `customfield_10021` | Array | `[{ value: "Impediment" }]` when flagged |
| Team | `customfield_10001` | Object | Team assignment in next-gen projects |

To discover all custom fields on your instance: call `getJiraIssue` on any issue and examine the `customFields` map. Every `customfield_*` key returned is valid for that instance.

---

## Setting custom fields

Pass an object to `customFields` on `createJiraIssue` or `updateJiraIssue`:

```json
{
  "customFields": {
    "customfield_10016": 5,
    "customfield_10021": [{ "value": "Impediment" }]
  }
}
```

The value format varies by field type:
- **Number fields** (story points): plain number — `5`
- **Select fields**: `{ "value": "Option Name" }`
- **Multi-select fields**: `[{ "value": "Option A" }, { "value": "Option B" }]`
- **User fields**: `{ "accountId": "..." }`
- **Date fields**: ISO 8601 string — `"2025-03-15"`

---

## Atlassian Document Format (ADF)

ADF is Jira's internal rich-text format. It is used for issue descriptions and comment bodies. Shoal handles the conversion automatically — pass plain text strings to `description`, `body`, etc. and Shoal wraps them in ADF before sending to the API.

The Jira API **rejects** plain string values for description/comment fields; they must be ADF. The Atlassian server has a bug where it sends plain strings, which causes `@mentions` to be stripped (#136).

### ADF structure

A minimal ADF document looks like this:

```json
{
  "type": "doc",
  "version": 1,
  "content": [
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "Hello world" }
      ]
    }
  ]
}
```

### @mentions in ADF

Mentions require an `mention` inline node with the user's `accountId`:

```json
{
  "type": "mention",
  "attrs": {
    "id": "5b109f2e9729b51b54dc274d",
    "text": "@Jane Smith"
  }
}
```

Use the `mentions` parameter on `addCommentToJiraIssue` and Shoal builds the mention nodes for you.

### Retrieving raw ADF

If `getJiraIssue` times out on an issue with heavy embedded media (images, video, etc.), pass `rawAdf: true` to retrieve the raw ADF JSON instead of the rendered plain text. This bypasses the rendering step that causes the timeout.

---

## Account IDs

Jira Cloud uses opaque account IDs (e.g. `5b109f2e9729b51b54dc274d`), not usernames or email addresses, for all user references. These appear in issue responses as `assignee.accountId`, `reporter.accountId`, `comment.author.accountId`, etc.

To find a user's account ID: look it up from an existing issue they're assigned to or commented on, or use the Jira user search API directly.

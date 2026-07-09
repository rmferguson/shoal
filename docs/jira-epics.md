# Jira Epics

Jira has two project types — **classic** and **next-gen** (also called team-managed) — and they handle epics differently. The fields, API behavior, and even what "epic" means varies between them.

---

## Project types

**Classic projects** are the original Jira model. Epics are a distinct issue type with extra fields, and child issues link to them via a dedicated custom field.

**Next-gen (team-managed) projects** are the newer model, introduced around 2019. The epic model is simplified: epics are just issues with a `parent` field, same as any other parent-child relationship.

You can tell which type a project is from `getJiraProjects` — the `style` field returns `"classic"` or `"next-gen"`.

---

## Creating an epic

Pass `issueType: "Epic"` to `createJiraIssue` in both project types.

**Classic projects** require an additional `epicName` field — the short label displayed on the epic chip in board views. It is stored in `customfield_10011` and is separate from `summary`. If you omit it, some Jira instances will reject the create; others will accept it but show a blank chip.

```
createJiraIssue({
  projectKey: "PROJ",
  issueType: "Epic",
  summary: "Q3 Infrastructure Hardening",
  epicName: "Infra Q3",         // classic projects only
})
```

**Next-gen projects** do not have a separate epic name field. `summary` is the only title field you need.

### Shortcut: `createJiraEpic`

`createJiraEpic` wraps the same fields shown above into a dedicated tool, so you don't need to remember `issueType: "Epic"` or the `customfield_10011` mapping:

```
createJiraEpic({
  projectKey: "PROJ",
  summary: "Q3 Infrastructure Hardening",
  epicName: "Infra Q3",         // classic projects only
})
```

It takes `projectKey`, `summary`, `epicName?`, `description?`, `assigneeAccountId?`, `priority?`, `labels?`, `components?`, and `customFields?`. There's no `parent` parameter — epics don't have a parent epic. Use `createJiraIssue` directly if you need fields this shortcut doesn't expose.

---

## Assigning a child issue to an epic

Use the `parent` parameter on `createJiraIssue` or `updateJiraIssue`. This sets `{ parent: { key: "EPIC-KEY" } }` in the fields payload.

```
createJiraIssue({
  projectKey: "PROJ",
  summary: "Add connection pooling",
  parent: "PROJ-42",
})

updateJiraIssue({
  issueKey: "PROJ-99",
  parent: "PROJ-42",
})
```

This works for **next-gen projects** and for **classic projects that use the parent link model** (most classic projects created after ~2021).

### Shortcut: `assignIssueToEpic`

`assignIssueToEpic` takes just `issueKey` and `epicKey` and handles the classic/next-gen distinction for you:

```
assignIssueToEpic({
  issueKey: "PROJ-99",
  epicKey: "PROJ-42",
})
```

It tries `parent` first. If Jira rejects that with a 400 mentioning the `parent` field — the legacy classic project case described below — it retries with `customfield_10014` automatically. The response's `via` field (`"parent"` or `"customfield_10014"`) tells you which one actually worked, so you never have to inspect the project's `style` first. Use `updateJiraIssue` directly if you need to set `parent` alongside other fields in the same call.

---

## Legacy classic projects (customfield_10014)

Older classic projects use a different mechanism: a custom field called `Epic Link` stored as `customfield_10014`. In these projects, `parent` on the fields object has no effect; you must set the epic link field directly.

Use `customFields` to fall back to this:

```
updateJiraIssue({
  issueKey: "PROJ-99",
  customFields: { "customfield_10014": "PROJ-42" },
})
```

How to tell which model your classic project uses: try setting `parent` first. If the API returns a 400 with a field error mentioning `parent`, fall back to `customfield_10014`.

---

## Field reference summary

| Field | Project type | Purpose |
|-------|-------------|---------|
| `issuetype: { name: "Epic" }` | Both | Marks the issue as an epic |
| `customfield_10011` | Classic only | Epic name (short chip label) |
| `parent: { key }` | Next-gen + modern classic | Links a child issue to its parent epic |
| `customfield_10014` | Legacy classic only | Epic Link — older parent-to-epic association |

---

## Epic hierarchy in next-gen projects

Next-gen projects support deeper nesting than classic: Epic → Story → Sub-task, or even deeper in some configurations. The `parent` field is used at every level. Classic projects have a fixed three-level hierarchy: Epic → Issue → Sub-task.

import { z } from "zod";
import { JiraClient } from "../jira/client.js";
import { plainTextToAdf } from "./adf-utils.js";
import { toToolError } from "../jira/errors.js";
import { hintForIssueError } from "./issue-type-hints.js";

export const CreateIssueInput = z.object({
  projectKey: z.string().describe("Jira project key, e.g. PROJ"),
  summary: z.string().min(1).describe("Issue summary/title"),
  issueType: z
    .string()
    .optional()
    .default("Task")
    .describe(
      "Issue type name, e.g. Bug, Story, Task, Epic. Issue type names are project-specific — " +
      "there is no fixed list. In particular, the correct subtask type name varies per project " +
      "('Subtask', 'Sub-task', or a custom name); guessing wrong fails with a 400 mentioning " +
      "'issuetype'. Call getJiraIssueTypes with this project's key first if unsure, especially " +
      "when nesting a child issue under a non-Epic parent (use the entry with subtask: true)."
    ),
  description: z.string().optional().describe("Issue description (plain text; will be wrapped in ADF)"),
  assigneeAccountId: z.string().optional().describe("Atlassian account ID of the assignee"),
  priority: z.string().optional().describe("Priority name, e.g. High, Medium, Low"),
  labels: z.array(z.string()).optional().describe("Labels to apply"),
  components: z.array(z.string()).optional().describe("Component names to assign"),
  parent: z
    .string()
    .optional()
    .describe(
      "Parent issue key to nest this issue under (e.g. PROJ-10). Setting parent does NOT by " +
      "itself mean issueType must be a subtask type — a Story or Task can legitimately have an " +
      "Epic as its parent. issueType only needs to be a subtask type when nesting under a " +
      "non-Epic issue (e.g. under a Task or Story), and the correct subtask type name varies " +
      "per project ('Subtask' vs 'Sub-task' vs custom) — call getJiraIssueTypes to find it " +
      "rather than guessing. Works for next-gen projects and classic projects using the parent " +
      "link model; legacy classic projects reject parent entirely and need " +
      "customFields: { customfield_10014: <epicKey> } instead (see assignIssueToEpic)."
    ),
  epicName: z
    .string()
    .optional()
    .describe("Epic name (classic projects only) — the short label shown on the epic chip, separate from summary. Set this when issueType is 'Epic' on a classic Jira project (sets customfield_10011)."),
  customFields: z
    .record(z.unknown())
    .optional()
    .describe("Custom field values keyed by customfield_XXXXX"),
});

export type CreateIssueInput = z.infer<typeof CreateIssueInput>;

export async function createJiraIssue(input: CreateIssueInput, client: JiraClient): Promise<unknown> {
  const { projectKey, summary, issueType, description, assigneeAccountId, priority, labels, components, parent, epicName, customFields } = input;

  const fields: Record<string, unknown> = {
    project: { key: projectKey.trim().toUpperCase() },
    summary: summary.trim(),
    issuetype: { name: issueType },
  };

  if (description) fields["description"] = plainTextToAdf(description);
  if (assigneeAccountId) fields["assignee"] = { accountId: assigneeAccountId };
  if (priority) fields["priority"] = { name: priority };
  if (labels?.length) fields["labels"] = labels;
  if (components?.length) fields["components"] = components.map((name) => ({ name }));
  if (parent) fields["parent"] = { key: parent.trim().toUpperCase() };
  if (epicName) fields["customfield_10011"] = epicName;
  if (customFields) Object.assign(fields, customFields);

  // Single POST — no retry (fixes #132 double-create).
  try {
    const result = await client.post<{ key: string; id: string; self: string }>(
      "/issue",
      { fields }
    );
    return { key: result.key, id: result.id, url: result.self };
  } catch (err) {
    const base = toToolError(err, "Request timed out creating issue.") as Record<string, unknown>;
    const hint = hintForIssueError(err, { projectKey: projectKey.trim().toUpperCase(), issueType, parent });
    return hint ? { ...base, hint } : base;
  }
}

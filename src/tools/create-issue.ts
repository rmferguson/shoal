import { z } from "zod";
import { JiraClient, JiraError } from "../jira/client.js";

export const CreateIssueInput = z.object({
  projectKey: z.string().describe("Jira project key, e.g. PROJ"),
  summary: z.string().min(1).describe("Issue summary/title"),
  issueType: z.string().optional().default("Task").describe("Issue type name, e.g. Bug, Story, Task, Epic"),
  description: z.string().optional().describe("Issue description (plain text; will be wrapped in ADF)"),
  assigneeAccountId: z.string().optional().describe("Atlassian account ID of the assignee"),
  priority: z.string().optional().describe("Priority name, e.g. High, Medium, Low"),
  labels: z.array(z.string()).optional().describe("Labels to apply"),
  components: z.array(z.string()).optional().describe("Component names to assign"),
  parent: z
    .string()
    .optional()
    .describe("Parent issue key to nest this issue under — use this to assign an epic (e.g. PROJ-10). Works for next-gen projects and classic projects using the parent link model."),
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

function plainTextToAdf(text: string): unknown {
  return {
    type: "doc",
    version: 1,
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

export async function createJiraIssue(input: CreateIssueInput): Promise<unknown> {
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
    const result = await new JiraClient().post<{ key: string; id: string; self: string }>(
      "/issue",
      { fields }
    );
    return { key: result.key, id: result.id, url: result.self };
  } catch (err) {
    if (err instanceof JiraError) {
      return { error: err.message, status: err.status, body: err.body };
    }
    throw err;
  }
}

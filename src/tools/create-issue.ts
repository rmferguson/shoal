import { z } from "zod";
import { JiraClient, JiraError } from "../jira/client.js";

export const CreateIssueInput = z.object({
  sessionId: z.string().describe("Session ID from OAuth flow"),
  projectKey: z.string().describe("Jira project key, e.g. PROJ"),
  summary: z.string().min(1).describe("Issue summary/title"),
  issueType: z.string().optional().default("Task").describe("Issue type name, e.g. Bug, Story, Task"),
  description: z.string().optional().describe("Issue description (plain text; will be wrapped in ADF)"),
  assigneeAccountId: z.string().optional().describe("Atlassian account ID of the assignee"),
  priority: z.string().optional().describe("Priority name, e.g. High, Medium, Low"),
  labels: z.array(z.string()).optional().describe("Labels to apply"),
  // Component names as strings — serialized correctly as {name} objects (fixes #95).
  components: z.array(z.string()).optional().describe("Component names to assign"),
  // Escape hatch for arbitrary custom fields.
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
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text }],
      },
    ],
  };
}

export async function createJiraIssue(input: CreateIssueInput): Promise<unknown> {
  const {
    sessionId,
    projectKey,
    summary,
    issueType,
    description,
    assigneeAccountId,
    priority,
    labels,
    components,
    customFields,
  } = input;

  const client = new JiraClient(sessionId);

  const fields: Record<string, unknown> = {
    project: { key: projectKey.trim().toUpperCase() },
    summary: summary.trim(),
    issuetype: { name: issueType },
  };

  if (description) {
    fields["description"] = plainTextToAdf(description);
  }

  if (assigneeAccountId) {
    fields["assignee"] = { accountId: assigneeAccountId };
  }

  if (priority) {
    fields["priority"] = { name: priority };
  }

  if (labels?.length) {
    fields["labels"] = labels;
  }

  // Correct component serialization — {name} objects not plain strings (fixes #95).
  if (components?.length) {
    fields["components"] = components.map((name) => ({ name }));
  }

  if (customFields) {
    Object.assign(fields, customFields);
  }

  // Single POST — no retry, no wrapper loop (fixes #132 double-create).
  let result: { key: string; id: string; self: string };
  try {
    result = await client.post<{ key: string; id: string; self: string }>(
      "/issue",
      { fields }
    );
  } catch (err) {
    if (err instanceof JiraError) {
      return { error: err.message, status: err.status, body: err.body };
    }
    throw err;
  }

  return {
    key: result.key,
    id: result.id,
    url: result.self,
  };
}

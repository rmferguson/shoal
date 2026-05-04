import { z } from "zod";
import { JiraClient, JiraError } from "../jira/client.js";

export const UpdateIssueInput = z.object({
  issueKey: z.string().describe("Jira issue key, e.g. PROJ-123"),
  summary: z.string().optional().describe("New summary/title for the issue"),
  description: z
    .string()
    .optional()
    .describe("New description (plain text — will be wrapped in ADF automatically)"),
  priority: z.string().optional().describe("Priority name, e.g. High, Medium, Low"),
  assigneeAccountId: z
    .string()
    .optional()
    .describe("Atlassian account ID of the assignee; pass empty string to unassign"),
  labels: z.array(z.string()).optional().describe("Full set of labels to apply to the issue"),
  components: z
    .array(z.string())
    .optional()
    .describe("Component names to set on the issue (serialized as [{ name }] objects)"),
  customFields: z
    .record(z.unknown())
    .optional()
    .describe("Additional custom fields to set, e.g. { customfield_10016: 5 } for story points"),
});

export type UpdateIssueInput = z.infer<typeof UpdateIssueInput>;

function wrapInAdf(text: string): unknown {
  return {
    type: "doc",
    version: 1,
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

export async function updateJiraIssue(input: UpdateIssueInput): Promise<unknown> {
  const { issueKey, summary, description, priority, assigneeAccountId, labels, components, customFields } = input;

  const fields: Record<string, unknown> = {};

  if (summary !== undefined) fields["summary"] = summary;
  if (description !== undefined) fields["description"] = wrapInAdf(description);
  if (priority !== undefined) fields["priority"] = { name: priority };
  if (assigneeAccountId !== undefined) {
    fields["assignee"] = assigneeAccountId === "" ? null : { accountId: assigneeAccountId };
  }
  if (labels !== undefined) fields["labels"] = labels;
  if (components !== undefined) fields["components"] = components.map((name) => ({ name }));
  if (customFields !== undefined) Object.assign(fields, customFields);

  try {
    await new JiraClient().put<void>(
      `/issue/${encodeURIComponent(issueKey.trim())}`,
      { fields }
    );
    return { success: true, issueKey: issueKey.trim() };
  } catch (err) {
    if (err instanceof JiraError) {
      return { error: err.message, status: err.status };
    }
    if (err instanceof Error && err.name === "AbortError") {
      return { error: `Request timed out updating issue ${issueKey}.` };
    }
    throw err;
  }
}

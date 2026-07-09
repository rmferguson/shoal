import { z } from "zod";
import { JiraClient } from "../jira/client.js";
import { plainTextToAdf } from "./adf-utils.js";
import { toToolError } from "../jira/errors.js";

export const CreateEpicInput = z.object({
  projectKey: z.string().describe("Jira project key, e.g. PROJ"),
  summary: z.string().min(1).describe("Epic summary/title"),
  epicName: z
    .string()
    .optional()
    .describe(
      "Epic name (classic projects only) — the short label shown on the epic chip, separate from summary. " +
        "Sets customfield_10011. Not used by next-gen (team-managed) projects."
    ),
  description: z.string().optional().describe("Epic description (plain text; will be wrapped in ADF)"),
  assigneeAccountId: z.string().optional().describe("Atlassian account ID of the assignee"),
  priority: z.string().optional().describe("Priority name, e.g. High, Medium, Low"),
  labels: z.array(z.string()).optional().describe("Labels to apply"),
  components: z.array(z.string()).optional().describe("Component names to assign"),
  customFields: z
    .record(z.unknown())
    .optional()
    .describe("Custom field values keyed by customfield_XXXXX"),
});

export type CreateEpicInput = z.infer<typeof CreateEpicInput>;

export async function createJiraEpic(input: CreateEpicInput, client: JiraClient): Promise<unknown> {
  const { projectKey, summary, epicName, description, assigneeAccountId, priority, labels, components, customFields } = input;

  const fields: Record<string, unknown> = {
    project: { key: projectKey.trim().toUpperCase() },
    summary: summary.trim(),
    issuetype: { name: "Epic" },
  };

  if (epicName) fields["customfield_10011"] = epicName;
  if (description) fields["description"] = plainTextToAdf(description);
  if (assigneeAccountId) fields["assignee"] = { accountId: assigneeAccountId };
  if (priority) fields["priority"] = { name: priority };
  if (labels?.length) fields["labels"] = labels;
  if (components?.length) fields["components"] = components.map((name) => ({ name }));
  if (customFields) Object.assign(fields, customFields);

  // Single POST — no retry (fixes #132 double-create).
  try {
    const result = await client.post<{ key: string; id: string; self: string }>(
      "/issue",
      { fields }
    );
    return { key: result.key, id: result.id, url: result.self };
  } catch (err) {
    return toToolError(err, "Request timed out creating epic.");
  }
}

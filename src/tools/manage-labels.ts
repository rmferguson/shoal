import { z } from "zod";
import { JiraClient } from "../jira/client.js";
import { toToolError } from "../jira/errors.js";

const ManageLabelsBase = z.object({
  issueKey: z.string().describe("Jira issue key, e.g. PROJ-123"),
  add: z.array(z.string()).optional().describe("Labels to add to the issue"),
  remove: z.array(z.string()).optional().describe("Labels to remove from the issue"),
});

export const ManageLabelsInput = ManageLabelsBase.refine(
  (data) => (data.add?.length ?? 0) + (data.remove?.length ?? 0) > 0,
  { message: "Provide at least one label to add or remove" }
);

export const ManageLabelsInputShape = ManageLabelsBase.shape;

export type ManageLabelsInput = z.infer<typeof ManageLabelsInput>;

export async function manageJiraIssueLabels(input: ManageLabelsInput, client: JiraClient): Promise<unknown> {
  const { issueKey, add, remove } = input;

  const labelOps: Array<{ add: string } | { remove: string }> = [];
  for (const label of add ?? []) labelOps.push({ add: label });
  for (const label of remove ?? []) labelOps.push({ remove: label });

  try {
    await client.put(`/issue/${encodeURIComponent(issueKey.trim())}`, {
      update: { labels: labelOps },
    });
    return { success: true, issueKey };
  } catch (err) {
    return toToolError(err, `Request timed out managing labels on ${issueKey}.`);
  }
}

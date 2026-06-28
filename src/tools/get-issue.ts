import { z } from "zod";
import { JiraClient } from "../jira/client.js";
import { extractIssueFields } from "./issue-fields.js";
import { renderAdf } from "./adf-utils.js";
import { toToolError } from "../jira/errors.js";

export const GetIssueInput = z.object({
  issueKey: z.string().describe("Jira issue key, e.g. PROJ-123"),
  rawAdf: z
    .boolean()
    .optional()
    .describe("Return raw ADF JSON for description instead of rendering. Use for media-heavy issues that hang."),
});

export type GetIssueInput = z.infer<typeof GetIssueInput>;

interface JiraIssueResponse {
  key: string;
  fields: Record<string, unknown>;
}

export async function getJiraIssue(input: GetIssueInput, client: JiraClient): Promise<unknown> {
  const { issueKey, rawAdf = false } = input;

  let issue: JiraIssueResponse;
  try {
    issue = await client.get<JiraIssueResponse>(
      `/issue/${encodeURIComponent(issueKey.trim())}?expand=renderedFields`
    );
  } catch (err) {
    return toToolError(
      err,
      `Request timed out fetching ${issueKey}. Try again with rawAdf: true to skip ADF rendering.`
    );
  }

  const fields = issue.fields;
  const { summary, status, assignee, priority, issueType, customFields } = extractIssueFields(fields);

  const reporter = fields["reporter"] as { displayName?: string } | undefined;
  const labels = fields["labels"] as string[] | undefined;
  const description = fields["description"];
  const descriptionText = rawAdf ? description : renderAdf(description);

  return {
    key: issue.key,
    summary,
    status,
    assignee,
    reporter: reporter?.displayName,
    priority,
    issueType,
    labels: labels ?? [],
    description: descriptionText,
    customFields,
  };
}

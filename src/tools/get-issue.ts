import { z } from "zod";
import { JiraClient, JiraError } from "../jira/client.js";
import { extractIssueFields } from "./issue-fields.js";

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

function renderAdf(adf: unknown): string {
  if (!adf || typeof adf !== "object") return "";
  const node = adf as { type?: string; text?: string; content?: unknown[] };
  if (node.text) return node.text;
  if (Array.isArray(node.content)) {
    return node.content.map(renderAdf).join("");
  }
  return "";
}

export async function getJiraIssue(input: GetIssueInput): Promise<unknown> {
  const { issueKey, rawAdf = false } = input;
  const client = new JiraClient();

  let issue: JiraIssueResponse;
  try {
    issue = await client.get<JiraIssueResponse>(
      `/issue/${encodeURIComponent(issueKey.trim())}?expand=renderedFields`
    );
  } catch (err) {
    if (err instanceof JiraError) {
      return { error: err.message, status: err.status };
    }
    if (err instanceof Error && err.name === "AbortError") {
      return {
        error: `Request timed out fetching ${issueKey}. Try again with rawAdf: true to skip ADF rendering.`,
      };
    }
    throw err;
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

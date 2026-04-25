import { z } from "zod";
import { JiraClient, JiraError } from "../jira/client.js";

export const GetIssueInput = z.object({
  sessionId: z.string().describe("Session ID from OAuth flow"),
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
  // Walk ADF and extract text content.
  const node = adf as { type?: string; text?: string; content?: unknown[] };
  if (node.text) return node.text;
  if (Array.isArray(node.content)) {
    return node.content.map(renderAdf).join("");
  }
  return "";
}

export async function getJiraIssue(input: GetIssueInput): Promise<unknown> {
  const { sessionId, issueKey, rawAdf = false } = input;
  const client = new JiraClient(sessionId);

  let issue: JiraIssueResponse;
  try {
    // Fetch all fields so custom fields are never silently dropped (fixes #119).
    issue = await client.get<JiraIssueResponse>(
      `/issue/${encodeURIComponent(issueKey.trim())}?expand=renderedFields`
    );
  } catch (err) {
    if (err instanceof JiraError) {
      return { error: err.message, status: err.status };
    }
    // AbortError = timeout (fixes #145 hang on media-heavy ADF).
    if (err instanceof Error && err.name === "AbortError") {
      return {
        error: `Request timed out fetching ${issueKey}. Try again with rawAdf: true to skip ADF rendering.`,
      };
    }
    throw err;
  }

  const fields = issue.fields;
  const status = fields["status"] as { name?: string } | undefined;
  const assignee = fields["assignee"] as { displayName?: string } | undefined;
  const priority = fields["priority"] as { name?: string } | undefined;
  const issuetype = fields["issuetype"] as { name?: string } | undefined;
  const reporter = fields["reporter"] as { displayName?: string } | undefined;
  const labels = fields["labels"] as string[] | undefined;
  const description = fields["description"];

  const descriptionText = rawAdf
    ? description
    : renderAdf(description);

  // Surface all custom fields alongside standard ones.
  const customFields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (key.startsWith("customfield_")) {
      customFields[key] = value;
    }
  }

  return {
    key: issue.key,
    summary: fields["summary"] as string | undefined,
    status: status?.name,
    assignee: assignee?.displayName,
    reporter: reporter?.displayName,
    priority: priority?.name,
    issueType: issuetype?.name,
    labels: labels ?? [],
    description: descriptionText,
    customFields,
  };
}

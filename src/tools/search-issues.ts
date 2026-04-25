import { z } from "zod";
import { JiraClient, JiraError } from "../jira/client.js";

export const SearchIssuesInput = z.object({
  sessionId: z.string().describe("Session ID from OAuth flow"),
  jql: z.string().describe("JQL query string, e.g. 'project = PROJ AND status = Open'"),
  startAt: z.number().int().min(0).optional().default(0).describe("0-based offset for pagination"),
  maxResults: z.number().int().min(1).max(100).optional().default(25).describe("Number of results to return (max 100)"),
  fields: z
    .array(z.string())
    .optional()
    .describe("Specific fields to return. Omit to get standard fields + all custom fields."),
});

export type SearchIssuesInput = z.infer<typeof SearchIssuesInput>;

interface JiraSearchResponse {
  total: number;
  startAt: number;
  maxResults: number;
  issues: Array<{
    key: string;
    fields: Record<string, unknown>;
  }>;
}

export async function searchJiraIssuesUsingJql(input: SearchIssuesInput): Promise<unknown> {
  const { sessionId, jql, startAt, maxResults, fields } = input;
  const client = new JiraClient(sessionId);

  const body: Record<string, unknown> = {
    jql: jql.trim(),
    startAt,
    maxResults,
  };

  if (fields?.length) {
    body["fields"] = fields;
  }
  // No fields filter = Jira returns all fields including custom ones (fixes #119).

  let result: JiraSearchResponse;
  try {
    result = await client.post<JiraSearchResponse>("/search/jql", body);
  } catch (err) {
    if (err instanceof JiraError) {
      return { error: err.message, status: err.status };
    }
    throw err;
  }

  const issues = result.issues.map((issue) => {
    const f = issue.fields;
    const status = f["status"] as { name?: string } | undefined;
    const assignee = f["assignee"] as { displayName?: string } | undefined;
    const priority = f["priority"] as { name?: string } | undefined;
    const issuetype = f["issuetype"] as { name?: string } | undefined;

    const customFields: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(f)) {
      if (key.startsWith("customfield_")) {
        customFields[key] = value;
      }
    }

    return {
      key: issue.key,
      summary: f["summary"] as string | undefined,
      status: status?.name,
      assignee: assignee?.displayName,
      priority: priority?.name,
      issueType: issuetype?.name,
      customFields,
    };
  });

  // Correct pagination — always return total and next offset (fixes #118).
  const nextStartAt = startAt + issues.length;
  const hasMore = nextStartAt < result.total;

  return {
    total: result.total,
    startAt: result.startAt,
    maxResults: result.maxResults,
    returned: issues.length,
    nextStartAt: hasMore ? nextStartAt : null,
    issues,
  };
}

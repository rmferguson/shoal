import { z } from "zod";
import { JiraClient, JiraError } from "../jira/client.js";

export const SearchIssuesInput = z.object({
  jql: z.string().describe("JQL query string, e.g. 'project = PROJ AND status = Open'"),
  nextPageToken: z.string().optional().describe("Cursor token from a previous response for pagination"),
  maxResults: z.number().int().min(1).max(100).optional().default(25).describe("Number of results to return (max 100)"),
  fields: z
    .array(z.string())
    .optional()
    .describe("Specific fields to return. Omit to get standard fields + all custom fields."),
});

export type SearchIssuesInput = z.infer<typeof SearchIssuesInput>;

interface JiraSearchResponse {
  isLast?: boolean;
  nextPageToken?: string;
  issues: Array<{
    key: string;
    fields?: Record<string, unknown>;
  }>;
}

export async function searchJiraIssuesUsingJql(input: SearchIssuesInput): Promise<unknown> {
  const { jql, nextPageToken, maxResults, fields } = input;
  const client = new JiraClient();

  const body: Record<string, unknown> = {
    jql: jql.trim(),
    maxResults,
    // Default to *navigable to match old /search behaviour — without this the
    // new /search/jql endpoint returns issues with no fields data.
    fields: fields?.length ? fields : ["*navigable"],
  };

  if (nextPageToken) {
    body["nextPageToken"] = nextPageToken;
  }

  let result: JiraSearchResponse;
  try {
    result = await client.post<JiraSearchResponse>("/search/jql", body);
  } catch (err) {
    if (err instanceof JiraError) {
      return { error: err.message, status: err.status };
    }
    throw err;
  }

  if (!Array.isArray(result.issues)) {
    return { error: "Unexpected response shape from /search/jql", raw: result };
  }

  const issues = result.issues.map((issue) => {
    const f: Record<string, unknown> = issue.fields ?? {};
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

  return {
    returned: issues.length,
    isLast: result.isLast ?? true,
    nextPageToken: result.isLast === false ? (result.nextPageToken ?? null) : null,
    issues,
  };
}

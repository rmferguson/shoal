import { z } from "zod";
import { JiraClient } from "../jira/client.js";
import { toToolError } from "../jira/errors.js";

export const GetIssueTypesInput = z.object({
  projectKey: z.string().describe(
    "Jira project key to look up available issue types for, e.g. PROJ. Use this to find the " +
    "exact issue type name to pass as issueType to createJiraIssue — in particular the correct " +
    "subtask type name (e.g. 'Subtask' vs 'Sub-task' vs a custom name), which varies by project " +
    "and cannot be guessed."
  ),
});

export type GetIssueTypesInput = z.infer<typeof GetIssueTypesInput>;

interface IssueTypeMeta {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  self: string;
  subtask: boolean;
}

interface IssueTypesResponse {
  maxResults: number;
  startAt: number;
  total: number;
  issueTypes: IssueTypeMeta[];
}

export async function getJiraIssueTypes(input: GetIssueTypesInput, client: JiraClient): Promise<unknown> {
  const projectKey = input.projectKey.trim().toUpperCase();

  try {
    const data = await client.get<IssueTypesResponse>(
      `/issue/createmeta/${encodeURIComponent(projectKey)}/issuetypes?maxResults=100`
    );
    return {
      projectKey,
      issueTypes: data.issueTypes.map((t) => ({
        id: t.id,
        name: t.name,
        subtask: t.subtask,
      })),
    };
  } catch (err) {
    return toToolError(err, `Request timed out fetching issue types for project ${projectKey}.`);
  }
}

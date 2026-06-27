import { z } from "zod";
import { JiraClient } from "../jira/client.js";
import { nextStartAt } from "./pagination.js";
import { renderAdf } from "./adf-utils.js";
import { toToolError } from "./errors.js";

export const GetCommentsInput = z.object({
  issueKey: z.string().describe("Jira issue key, e.g. PROJ-123"),
  startAt: z.number().optional().default(0).describe("Offset for pagination (default: 0)"),
  maxResults: z
    .number()
    .optional()
    .default(25)
    .describe("Maximum number of comments to return (default: 25, max: 100)"),
});

export type GetCommentsInput = z.infer<typeof GetCommentsInput>;

interface JiraAuthor {
  displayName: string;
  accountId: string;
}

interface JiraComment {
  id: string;
  author: JiraAuthor;
  created: string;
  updated: string;
  body: unknown;
}

interface JiraCommentsResponse {
  total: number;
  startAt: number;
  maxResults: number;
  comments: JiraComment[];
}

export async function getJiraIssueComments(input: GetCommentsInput): Promise<unknown> {
  const { issueKey, startAt, maxResults } = input;
  const client = new JiraClient();
  const clampedMax = Math.min(maxResults, 100);

  try {
    const data = await client.get<JiraCommentsResponse>(
      `/issue/${encodeURIComponent(issueKey.trim())}/comment?startAt=${startAt}&maxResults=${clampedMax}&orderBy=created`
    );

    const returned = data.comments.length;
    const next = nextStartAt(startAt, returned, data.total);

    return {
      total: data.total,
      startAt: data.startAt,
      maxResults: data.maxResults,
      returned,
      nextStartAt: next,
      comments: data.comments.map((c) => ({
        id: c.id,
        author: { displayName: c.author.displayName, accountId: c.author.accountId },
        created: c.created,
        updated: c.updated,
        body: renderAdf(c.body),
      })),
    };
  } catch (err) {
    return toToolError(err, `Request timed out fetching comments for ${issueKey}.`);
  }
}

import { z } from "zod";
import { JiraClient } from "../jira/client.js";
import { nextStartAt } from "./pagination.js";
import { renderAdf } from "./adf-utils.js";
import { toToolError } from "../jira/errors.js";

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

export async function getJiraIssueComments(input: GetCommentsInput, client: JiraClient): Promise<unknown> {
  const { issueKey, startAt, maxResults } = input;
  const clampedMax = Math.min(maxResults, 100);

  try {
    const data = await client.get<JiraCommentsResponse>(
      `/issue/${encodeURIComponent(issueKey.trim())}/comment?startAt=${startAt}&maxResults=${clampedMax}&orderBy=created`
    );

    const returned = data.comments.length;
    const nextOffset = nextStartAt(startAt, returned, data.total);

    return {
      total: data.total,
      startAt: data.startAt,
      maxResults: data.maxResults,
      returned,
      nextStartAt: nextOffset,
      comments: data.comments.map((comment) => ({
        id: comment.id,
        author: { displayName: comment.author.displayName, accountId: comment.author.accountId },
        created: comment.created,
        updated: comment.updated,
        body: renderAdf(comment.body),
      })),
    };
  } catch (err) {
    return toToolError(err, `Request timed out fetching comments for ${issueKey}.`);
  }
}

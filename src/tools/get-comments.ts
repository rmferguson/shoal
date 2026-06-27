import { z } from "zod";
import { JiraClient, JiraError } from "../jira/client.js";
import { nextStartAt } from "./pagination.js";

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

function renderAdf(adf: unknown): string {
  if (!adf || typeof adf !== "object") return "";
  const node = adf as { type?: string; text?: string; content?: unknown[] };
  if (node.text) return node.text;
  if (Array.isArray(node.content)) return node.content.map(renderAdf).join("");
  return "";
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
    if (err instanceof JiraError) {
      return { error: err.message, status: err.status };
    }
    if (err instanceof Error && err.name === "AbortError") {
      return { error: `Request timed out fetching comments for ${issueKey}.` };
    }
    throw err;
  }
}

import { z } from "zod";
import { JiraClient } from "../jira/client.js";
import { toToolError } from "./errors.js";

export const EditCommentInput = z.object({
  issueKey: z.string().describe("Jira issue key, e.g. PROJ-123"),
  commentId: z.string().describe("ID of the comment to edit"),
  body: z.string().describe("New comment text body"),
});

export type EditCommentInput = z.infer<typeof EditCommentInput>;

interface JiraCommentResponse {
  id: string;
  updated: string;
  author: { displayName: string; accountId: string };
}

function buildAdfBody(text: string): object {
  return {
    type: "doc",
    version: 1,
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

export async function editJiraIssueComment(input: EditCommentInput): Promise<unknown> {
  const { issueKey, commentId, body } = input;
  const client = new JiraClient();

  try {
    const comment = await client.put<JiraCommentResponse>(
      `/issue/${encodeURIComponent(issueKey.trim())}/comment/${encodeURIComponent(commentId)}`,
      { body: buildAdfBody(body) }
    );

    return {
      id: comment.id,
      updated: comment.updated,
      author: { displayName: comment.author.displayName, accountId: comment.author.accountId },
    };
  } catch (err) {
    return toToolError(err, `Request timed out editing comment ${commentId} on ${issueKey}.`);
  }
}

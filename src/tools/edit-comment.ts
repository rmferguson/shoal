import { z } from "zod";
import { JiraClient } from "../jira/client.js";
import { plainTextToAdf } from "./adf-utils.js";
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

export async function editJiraIssueComment(input: EditCommentInput, client: JiraClient): Promise<unknown> {
  const { issueKey, commentId, body } = input;

  try {
    const comment = await client.put<JiraCommentResponse>(
      `/issue/${encodeURIComponent(issueKey.trim())}/comment/${encodeURIComponent(commentId)}`,
      { body: plainTextToAdf(body) }
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

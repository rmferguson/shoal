import { z } from "zod";
import { JiraClient } from "../jira/client.js";
import { buildAdfWithMentions } from "./adf-utils.js";
import { toToolError } from "../jira/errors.js";

export const AddCommentInput = z.object({
  issueKey: z.string().describe("Jira issue key, e.g. PROJ-123"),
  body: z.string().describe("Comment text body"),
  mentions: z
    .array(
      z.object({
        accountId: z.string().describe("Atlassian account ID of the user to mention"),
        displayName: z.string().describe("Display name shown in the mention"),
      })
    )
    .optional()
    .describe("Optional list of users to @mention in the comment"),
});

export type AddCommentInput = z.infer<typeof AddCommentInput>;

interface JiraCommentResponse {
  id: string;
  created: string;
  author: { displayName: string; accountId: string };
}

export async function addCommentToJiraIssue(input: AddCommentInput): Promise<unknown> {
  const { issueKey, body, mentions } = input;
  const client = new JiraClient();

  try {
    const comment = await client.post<JiraCommentResponse>(
      `/issue/${encodeURIComponent(issueKey.trim())}/comment`,
      { body: buildAdfWithMentions(body, mentions) }
    );

    return {
      id: comment.id,
      created: comment.created,
      author: { displayName: comment.author.displayName, accountId: comment.author.accountId },
    };
  } catch (err) {
    return toToolError(err, `Request timed out adding comment to ${issueKey}.`);
  }
}

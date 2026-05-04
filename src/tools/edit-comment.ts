import { z } from "zod";
import { JiraClient, JiraError } from "../jira/client.js";

export const EditCommentInput = z.object({
  sessionId: z.string().describe("Session ID from OAuth flow"),
  issueKey: z.string().describe("Jira issue key, e.g. PROJ-123"),
  commentId: z.string().describe("ID of the comment to edit"),
  body: z.string().describe("New comment text body"),
});

export type EditCommentInput = z.infer<typeof EditCommentInput>;

interface JiraCommentResponse {
  id: string;
  updated: string;
  author: {
    displayName: string;
    accountId: string;
  };
}

function buildAdfBody(text: string): object {
  return {
    type: "doc",
    version: 1,
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text }],
      },
    ],
  };
}

export async function editJiraIssueComment(input: EditCommentInput): Promise<unknown> {
  const { sessionId, issueKey, commentId, body } = input;
  const client = new JiraClient(sessionId);

  try {
    const comment = await client.put<JiraCommentResponse>(
      `/issue/${encodeURIComponent(issueKey.trim())}/comment/${encodeURIComponent(commentId)}`,
      { body: buildAdfBody(body) }
    );

    return {
      id: comment.id,
      updated: comment.updated,
      author: {
        displayName: comment.author.displayName,
        accountId: comment.author.accountId,
      },
    };
  } catch (err) {
    if (err instanceof JiraError) {
      return { error: err.message, status: err.status };
    }
    if (err instanceof Error && err.name === "AbortError") {
      return { error: `Request timed out editing comment ${commentId} on ${issueKey}.` };
    }
    throw err;
  }
}

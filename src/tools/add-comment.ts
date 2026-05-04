import { z } from "zod";
import { JiraClient, JiraError } from "../jira/client.js";

export const AddCommentInput = z.object({
  sessionId: z.string().describe("Session ID from OAuth flow"),
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

interface AdfNode {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: AdfNode[];
  version?: number;
}

interface JiraCommentResponse {
  id: string;
  created: string;
  author: {
    displayName: string;
    accountId: string;
  };
}

function buildAdfBody(body: string, mentions?: { accountId: string; displayName: string }[]): AdfNode {
  const paragraphContent: AdfNode[] = [];

  // Add the main text node
  if (body) {
    paragraphContent.push({ type: "text", text: body });
  }

  // Append mention nodes after the main text (fixes Atlassian #136 where mentions are downgraded to plain text)
  if (mentions && mentions.length > 0) {
    // Add a space separator if there's already body text
    if (body) {
      paragraphContent.push({ type: "text", text: " " });
    }
    for (const mention of mentions) {
      paragraphContent.push({
        type: "mention",
        attrs: {
          id: mention.accountId,
          text: `@${mention.displayName}`,
          accessLevel: "APPLICATION",
        },
      });
    }
  }

  return {
    type: "doc",
    version: 1,
    content: [
      {
        type: "paragraph",
        content: paragraphContent,
      },
    ],
  };
}

export async function addCommentToJiraIssue(input: AddCommentInput): Promise<unknown> {
  const { sessionId, issueKey, body, mentions } = input;
  const client = new JiraClient(sessionId);

  try {
    const adfBody = buildAdfBody(body, mentions);

    const comment = await client.post<JiraCommentResponse>(
      `/issue/${encodeURIComponent(issueKey.trim())}/comment`,
      { body: adfBody }
    );

    return {
      id: comment.id,
      created: comment.created,
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
      return { error: `Request timed out adding comment to ${issueKey}.` };
    }
    throw err;
  }
}

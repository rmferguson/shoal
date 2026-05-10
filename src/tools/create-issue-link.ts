import { z } from "zod";
import { JiraClient, JiraError } from "../jira/client.js";

export const CreateIssueLinkInput = z.object({
  linkType: z.string().describe(
    'Name of the link type, e.g. "Blocks", "Relates", "Duplicate", "Cloners". ' +
    "Call getJiraIssueLinkTypes to list valid names for your instance."
  ),
  inwardIssueKey: z.string().describe(
    'Issue key for the inward side of the link (e.g. the issue that "is blocked by" the outward issue)'
  ),
  outwardIssueKey: z.string().describe(
    'Issue key for the outward side of the link (e.g. the issue that "blocks" the inward issue)'
  ),
  comment: z.string().optional().describe("Optional comment to add alongside the link"),
});

export type CreateIssueLinkInput = z.infer<typeof CreateIssueLinkInput>;

export async function createJiraIssueLink(input: CreateIssueLinkInput): Promise<unknown> {
  const { linkType, inwardIssueKey, outwardIssueKey, comment } = input;
  const client = new JiraClient();

  const body: Record<string, unknown> = {
    type: { name: linkType },
    inwardIssue: { key: inwardIssueKey.trim() },
    outwardIssue: { key: outwardIssueKey.trim() },
  };

  if (comment) {
    body.comment = {
      body: {
        type: "doc",
        version: 1,
        content: [{ type: "paragraph", content: [{ type: "text", text: comment }] }],
      },
    };
  }

  try {
    await client.post<void>("/issueLink", body);
    return { success: true, inwardIssueKey, outwardIssueKey, linkType };
  } catch (err) {
    if (err instanceof JiraError) {
      return { error: err.message, status: err.status, body: err.body };
    }
    if (err instanceof Error && err.name === "AbortError") {
      return { error: `Request timed out creating issue link.` };
    }
    throw err;
  }
}

import { z } from "zod";
import { JiraClient } from "../jira/client.js";
import { toToolError } from "../jira/errors.js";

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

export async function createJiraIssueLink(input: CreateIssueLinkInput, client: JiraClient): Promise<unknown> {
  const { linkType, inwardIssueKey, outwardIssueKey, comment } = input;

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
    return toToolError(err, "Request timed out creating issue link.");
  }
}

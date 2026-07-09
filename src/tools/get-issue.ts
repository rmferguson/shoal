import { z } from "zod";
import { JiraClient } from "../jira/client.js";
import { extractIssueFields } from "./issue-fields.js";
import { renderAdf } from "./adf-utils.js";
import { toToolError } from "../jira/errors.js";

export const GetIssueInput = z.object({
  issueKey: z.string().describe("Jira issue key, e.g. PROJ-123"),
  rawAdf: z
    .boolean()
    .optional()
    .describe("Return raw ADF JSON for description instead of rendering. Use for media-heavy issues that hang."),
});

export type GetIssueInput = z.infer<typeof GetIssueInput>;

interface JiraIssueResponse {
  key: string;
  fields: Record<string, unknown>;
}

interface RawIssueLink {
  type?: { name?: string; inward?: string; outward?: string };
  inwardIssue?: { key?: string; fields?: { summary?: string } };
  outwardIssue?: { key?: string; fields?: { summary?: string } };
}

interface IssueLinkSummary {
  type: string | undefined;
  direction: string | undefined;
  issueKey: string | undefined;
  summary: string | undefined;
}

/**
 * Shape raw `issuelinks` entries into a readable summary: the link type's
 * direction-appropriate label (inward/outward) plus the linked issue's key
 * and summary. Each entry has either an inwardIssue or an outwardIssue, never
 * both.
 */
function extractIssueLinks(fields: Record<string, unknown>): IssueLinkSummary[] {
  const rawLinks = fields["issuelinks"] as RawIssueLink[] | undefined;
  if (!Array.isArray(rawLinks)) return [];

  return rawLinks.map((link) => {
    const linkedIssue = link.inwardIssue ?? link.outwardIssue;
    const direction = link.inwardIssue ? link.type?.inward : link.type?.outward;
    return {
      type: link.type?.name,
      direction,
      issueKey: linkedIssue?.key,
      summary: linkedIssue?.fields?.summary,
    };
  });
}

export async function getJiraIssue(input: GetIssueInput, client: JiraClient): Promise<unknown> {
  const { issueKey, rawAdf = false } = input;

  let issue: JiraIssueResponse;
  try {
    issue = await client.get<JiraIssueResponse>(
      `/issue/${encodeURIComponent(issueKey.trim())}?expand=renderedFields`
    );
  } catch (err) {
    return toToolError(
      err,
      `Request timed out fetching ${issueKey}. Try again with rawAdf: true to skip ADF rendering.`
    );
  }

  const fields = issue.fields;
  const { summary, status, assignee, priority, issueType, customFields } = extractIssueFields(fields);

  const reporter = fields["reporter"] as { displayName?: string } | undefined;
  const labels = fields["labels"] as string[] | undefined;
  const description = fields["description"];
  const descriptionText = rawAdf ? description : renderAdf(description);
  const issueLinks = extractIssueLinks(fields);

  return {
    key: issue.key,
    summary,
    status,
    assignee,
    reporter: reporter?.displayName,
    priority,
    issueType,
    labels: labels ?? [],
    description: descriptionText,
    customFields,
    issueLinks,
  };
}

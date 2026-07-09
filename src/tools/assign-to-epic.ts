import { z } from "zod";
import { JiraClient, JiraError } from "../jira/client.js";
import { toToolError } from "../jira/errors.js";

export const AssignToEpicInput = z.object({
  issueKey: z.string().describe("Issue key to assign to an epic, e.g. PROJ-99"),
  epicKey: z.string().describe("Epic issue key to assign the issue under, e.g. PROJ-42"),
});

export type AssignToEpicInput = z.infer<typeof AssignToEpicInput>;

/**
 * True when a 400 response body indicates Jira rejected the `parent` field itself
 * (legacy classic projects that still use the customfield_10014 Epic Link model).
 * Any other 400 (e.g. bad issue key, permission error) is not this case and should
 * propagate as-is rather than being masked by a fallback retry.
 */
function isParentFieldRejection(err: unknown): boolean {
  if (!(err instanceof JiraError) || err.status !== 400) return false;
  return /\bparent\b/i.test(err.body);
}

export async function assignIssueToEpic(input: AssignToEpicInput, client: JiraClient): Promise<unknown> {
  const issueKey = input.issueKey.trim().toUpperCase();
  const epicKey = input.epicKey.trim().toUpperCase();
  const path = `/issue/${encodeURIComponent(issueKey)}`;

  try {
    await client.put<void>(path, { fields: { parent: { key: epicKey } } });
    return { success: true, issueKey, epicKey, via: "parent" };
  } catch (err) {
    if (!isParentFieldRejection(err)) {
      return toToolError(err, `Request timed out assigning ${issueKey} to epic ${epicKey}.`);
    }
  }

  // Legacy classic project — `parent` isn't a valid field here, fall back to the
  // Epic Link custom field (customfield_10014). See docs/jira-epics.md.
  try {
    await client.put<void>(path, { fields: { customfield_10014: epicKey } });
    return { success: true, issueKey, epicKey, via: "customfield_10014" };
  } catch (err) {
    return toToolError(err, `Request timed out assigning ${issueKey} to epic ${epicKey}.`);
  }
}

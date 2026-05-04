import { z } from "zod";
import { JiraClient, JiraError } from "../jira/client.js";

export const TransitionIssueInput = z.object({
  sessionId: z.string().describe("Session ID from OAuth flow"),
  issueKey: z.string().describe("Jira issue key, e.g. PROJ-123"),
  transitionId: z.string().describe("Transition ID from getJiraTransitions"),
  clearResolution: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Set to true when reopening an issue to explicitly null out the Resolution field, " +
        "preventing transition errors (fixes Atlassian bug #85)"
    ),
});

export type TransitionIssueInput = z.infer<typeof TransitionIssueInput>;

export async function transitionJiraIssue(input: TransitionIssueInput): Promise<unknown> {
  const { sessionId, issueKey, transitionId, clearResolution } = input;
  const client = new JiraClient(sessionId);

  const body: Record<string, unknown> = {
    transition: { id: transitionId },
  };

  if (clearResolution) {
    body["update"] = { resolution: [{ set: null }] };
  }

  try {
    await client.post<void>(
      `/issue/${encodeURIComponent(issueKey.trim())}/transitions`,
      body
    );

    return { success: true, issueKey: issueKey.trim() };
  } catch (err) {
    if (err instanceof JiraError) {
      return { error: err.message, status: err.status };
    }
    if (err instanceof Error && err.name === "AbortError") {
      return { error: `Request timed out transitioning issue ${issueKey}.` };
    }
    throw err;
  }
}

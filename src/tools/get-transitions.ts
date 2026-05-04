import { z } from "zod";
import { JiraClient, JiraError } from "../jira/client.js";

export const GetTransitionsInput = z.object({
  sessionId: z.string().describe("Session ID from OAuth flow"),
  issueKey: z.string().describe("Jira issue key, e.g. PROJ-123"),
});

export type GetTransitionsInput = z.infer<typeof GetTransitionsInput>;

interface JiraStatusCategory {
  id: number;
  key: string;
  name: string;
}

interface JiraTransitionTo {
  id: string;
  name: string;
  statusCategory: JiraStatusCategory;
}

interface JiraTransition {
  id: string;
  name: string;
  to: JiraTransitionTo;
}

interface JiraTransitionsResponse {
  transitions: JiraTransition[];
}

export async function getJiraTransitions(input: GetTransitionsInput): Promise<unknown> {
  const { sessionId, issueKey } = input;
  const client = new JiraClient(sessionId);

  try {
    const data = await client.get<JiraTransitionsResponse>(
      `/issue/${encodeURIComponent(issueKey.trim())}/transitions`
    );

    return {
      issueKey: issueKey.trim(),
      transitions: data.transitions.map((t) => ({
        id: t.id,
        name: t.name,
        to: {
          id: t.to.id,
          name: t.to.name,
          statusCategory: t.to.statusCategory,
        },
      })),
    };
  } catch (err) {
    if (err instanceof JiraError) {
      return { error: err.message, status: err.status };
    }
    if (err instanceof Error && err.name === "AbortError") {
      return { error: `Request timed out fetching transitions for ${issueKey}.` };
    }
    throw err;
  }
}

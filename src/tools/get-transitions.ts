import { z } from "zod";
import { JiraClient } from "../jira/client.js";
import { toToolError } from "./errors.js";

export const GetTransitionsInput = z.object({
  issueKey: z.string().describe("Jira issue key, e.g. PROJ-123"),
});

export type GetTransitionsInput = z.infer<typeof GetTransitionsInput>;

interface JiraStatusCategory {
  id: number;
  key: string;
  name: string;
}

interface JiraTransition {
  id: string;
  name: string;
  to: {
    id: string;
    name: string;
    statusCategory: JiraStatusCategory;
  };
}

interface JiraTransitionsResponse {
  transitions: JiraTransition[];
}

export async function getJiraTransitions(input: GetTransitionsInput, client: JiraClient): Promise<unknown> {
  const { issueKey } = input;

  try {
    const data = await client.get<JiraTransitionsResponse>(
      `/issue/${encodeURIComponent(issueKey.trim())}/transitions`
    );

    return {
      issueKey: issueKey.trim(),
      transitions: data.transitions.map((transition) => ({
        id: transition.id,
        name: transition.name,
        to: {
          id: transition.to.id,
          name: transition.to.name,
          statusCategory: transition.to.statusCategory,
        },
      })),
    };
  } catch (err) {
    return toToolError(err, `Request timed out fetching transitions for ${issueKey}.`);
  }
}

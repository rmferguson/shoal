import { z } from "zod";
import { JiraClient, JiraError } from "../jira/client.js";

export const GetIssueLinkTypesInput = z.object({});

export type GetIssueLinkTypesInput = z.infer<typeof GetIssueLinkTypesInput>;

interface LinkType {
  id: string;
  name: string;
  inward: string;
  outward: string;
}

interface LinkTypesResponse {
  issueLinkTypes: LinkType[];
}

export async function getJiraIssueLinkTypes(_input: GetIssueLinkTypesInput): Promise<unknown> {
  const client = new JiraClient();

  try {
    const data = await client.get<LinkTypesResponse>("/issueLinkType");
    return {
      linkTypes: data.issueLinkTypes.map((t) => ({
        id: t.id,
        name: t.name,
        inward: t.inward,
        outward: t.outward,
      })),
    };
  } catch (err) {
    if (err instanceof JiraError) {
      return { error: err.message, status: err.status };
    }
    if (err instanceof Error && err.name === "AbortError") {
      return { error: "Request timed out fetching issue link types." };
    }
    throw err;
  }
}

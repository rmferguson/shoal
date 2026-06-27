import { z } from "zod";
import { JiraClient } from "../jira/client.js";
import { toToolError } from "./errors.js";

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

export async function getJiraIssueLinkTypes(): Promise<unknown> {
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
    return toToolError(err, "Request timed out fetching issue link types.");
  }
}

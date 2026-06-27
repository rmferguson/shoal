import { z } from "zod";
import { JiraClient } from "../jira/client.js";
import { nextStartAt } from "./pagination.js";
import { toToolError } from "./errors.js";

export const GetProjectsInput = z.object({
  startAt: z.number().int().min(0).optional().default(0).describe("Pagination offset (default 0)"),
  maxResults: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(50)
    .describe("Number of projects to return (default 50, max 100)"),
});

export type GetProjectsInput = z.infer<typeof GetProjectsInput>;

interface JiraProject {
  id: string;
  key: string;
  name: string;
  projectTypeKey: string;
  style: string;
}

interface JiraProjectSearchResponse {
  total: number;
  startAt: number;
  maxResults: number;
  values: JiraProject[];
}

export async function getJiraProjects(input: GetProjectsInput): Promise<unknown> {
  const { startAt, maxResults } = input;
  const client = new JiraClient();

  try {
    const params = new URLSearchParams({
      startAt: String(startAt),
      maxResults: String(maxResults),
    });

    const data = await client.get<JiraProjectSearchResponse>(
      `/project/search?${params.toString()}`
    );

    const returned = data.values.length;
    const next = nextStartAt(startAt, returned, data.total);

    return {
      total: data.total,
      startAt: data.startAt,
      maxResults: data.maxResults,
      returned,
      nextStartAt: next,
      projects: data.values.map((project) => ({
        id: project.id,
        key: project.key,
        name: project.name,
        projectTypeKey: project.projectTypeKey,
        style: project.style,
      })),
    };
  } catch (err) {
    return toToolError(err, "Request timed out fetching projects.");
  }
}

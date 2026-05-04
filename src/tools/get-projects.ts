import { z } from "zod";
import { JiraClient, JiraError } from "../jira/client.js";

export const GetProjectsInput = z.object({
  sessionId: z.string().describe("Session ID from OAuth flow"),
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
  const { sessionId, startAt, maxResults } = input;
  const client = new JiraClient(sessionId);

  try {
    const params = new URLSearchParams({
      startAt: String(startAt),
      maxResults: String(maxResults),
    });

    const data = await client.get<JiraProjectSearchResponse>(
      `/project/search?${params.toString()}`
    );

    const returned = data.values.length;
    const nextStartAt = startAt + returned < data.total ? startAt + returned : null;

    return {
      total: data.total,
      startAt: data.startAt,
      maxResults: data.maxResults,
      returned,
      nextStartAt,
      projects: data.values.map((p) => ({
        id: p.id,
        key: p.key,
        name: p.name,
        projectTypeKey: p.projectTypeKey,
        style: p.style,
      })),
    };
  } catch (err) {
    if (err instanceof JiraError) {
      return { error: err.message, status: err.status };
    }
    if (err instanceof Error && err.name === "AbortError") {
      return { error: "Request timed out fetching projects." };
    }
    throw err;
  }
}

import { z } from "zod";
import { GitHubClient } from "../../github/client.js";
import { handleGitHubError } from "./errors.js";

export const CreateGithubIssueInput = z.object({
  owner: z.string().describe("GitHub repository owner (user or organization)"),
  repo: z.string().describe("GitHub repository name"),
  title: z.string().min(1).describe("Issue title"),
  body: z.string().optional().describe("Issue body (markdown supported)"),
  labels: z.array(z.string()).optional().describe("Labels to apply to the issue"),
  assignees: z.array(z.string()).optional().describe("GitHub usernames to assign"),
  milestone: z.number().int().optional().describe("Milestone number to associate with the issue"),
});

export type CreateGithubIssueInput = z.infer<typeof CreateGithubIssueInput>;

interface GitHubCreatedIssue {
  number: number;
  title: string;
  html_url: string;
}

export async function createGithubIssue(client: GitHubClient, input: CreateGithubIssueInput): Promise<unknown> {
  const { owner, repo, title, body, labels, assignees, milestone } = input;

  const payload: Record<string, unknown> = { title };
  if (body !== undefined) payload["body"] = body;
  if (labels !== undefined) payload["labels"] = labels;
  if (assignees !== undefined) payload["assignees"] = assignees;
  if (milestone !== undefined) payload["milestone"] = milestone;

  try {
    const issue = await client.post<GitHubCreatedIssue>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`,
      payload
    );

    return {
      number: issue.number,
      title: issue.title,
      html_url: issue.html_url,
    };
  } catch (err) {
    return handleGitHubError(err);
  }
}

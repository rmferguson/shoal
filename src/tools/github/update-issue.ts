import { z } from "zod";
import { GitHubClient } from "../../github/client.js";
import { handleGitHubError } from "./errors.js";

export const UpdateGithubIssueInput = z.object({
  owner: z.string().describe("GitHub repository owner (user or organization)"),
  repo: z.string().describe("GitHub repository name"),
  issue_number: z.number().int().min(1).describe("Issue number to update"),
  title: z.string().optional().describe("New issue title"),
  body: z.string().optional().describe("New issue body (markdown supported)"),
  state: z.enum(["open", "closed"]).optional().describe("New issue state"),
  labels: z.array(z.string()).optional().describe("Full replacement of labels (replaces all existing labels)"),
  assignees: z.array(z.string()).optional().describe("Full replacement of assignees (replaces all existing assignees)"),
  milestone: z.number().int().nullable().optional().describe("Milestone number to set, or null to clear"),
});

export type UpdateGithubIssueInput = z.infer<typeof UpdateGithubIssueInput>;

interface GitHubUpdatedIssue {
  number: number;
  title: string;
  state: string;
  html_url: string;
}

export async function updateGithubIssue(client: GitHubClient, input: UpdateGithubIssueInput): Promise<unknown> {
  const { owner, repo, issue_number, title, body, state, labels, assignees, milestone } = input;

  const payload: Record<string, unknown> = {};
  if (title !== undefined) payload["title"] = title;
  if (body !== undefined) payload["body"] = body;
  if (state !== undefined) payload["state"] = state;
  if (labels !== undefined) payload["labels"] = labels;
  if (assignees !== undefined) payload["assignees"] = assignees;
  if (milestone !== undefined) payload["milestone"] = milestone;

  try {
    const issue = await client.patch<GitHubUpdatedIssue>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issue_number}`,
      payload
    );

    return {
      number: issue.number,
      title: issue.title,
      state: issue.state,
      html_url: issue.html_url,
    };
  } catch (err) {
    return handleGitHubError(err);
  }
}

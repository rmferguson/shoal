import { z } from "zod";
import { GitHubClient } from "../../github/client.js";
import { handleGitHubError } from "./errors.js";

export const ListGithubIssuesInput = z.object({
  owner: z.string().describe("GitHub repository owner (user or organization)"),
  repo: z.string().describe("GitHub repository name"),
  state: z.enum(["open", "closed", "all"]).default("open").describe("Filter issues by state"),
  labels: z.string().optional().describe("Comma-separated list of label names to filter by"),
  page: z.number().int().min(1).default(1).describe("Page number for pagination"),
  perPage: z.number().int().min(1).max(100).default(30).describe("Number of issues per page (max 100)"),
});

export type ListGithubIssuesInput = z.infer<typeof ListGithubIssuesInput>;

interface GitHubLabel {
  name: string;
}

interface GitHubUser {
  login: string;
}

interface GitHubIssueItem {
  number: number;
  title: string;
  state: string;
  labels: GitHubLabel[];
  assignees: GitHubUser[];
  created_at: string;
  updated_at: string;
  html_url: string;
}

export async function listGithubIssues(client: GitHubClient, input: ListGithubIssuesInput): Promise<unknown> {
  const { owner, repo, state, labels, page, perPage } = input;

  const params = new URLSearchParams({
    state,
    page: String(page),
    per_page: String(perPage),
  });
  if (labels) params.set("labels", labels);

  try {
    const issues = await client.get<GitHubIssueItem[]>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues?${params.toString()}`
    );

    return {
      returned: issues.length,
      issues: issues.map((issue) => ({
        number: issue.number,
        title: issue.title,
        state: issue.state,
        labels: issue.labels.map((l) => l.name),
        assignees: issue.assignees.map((a) => a.login),
        created_at: issue.created_at,
        updated_at: issue.updated_at,
        html_url: issue.html_url,
      })),
    };
  } catch (err) {
    return handleGitHubError(err);
  }
}

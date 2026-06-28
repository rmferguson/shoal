import { z } from "zod";
import { GitHubClient, GitHubError } from "../../github/client.js";
import { getGitHubConfig } from "../../github/config.js";

export const GetGithubIssueInput = z.object({
  owner: z.string().describe("GitHub repository owner (user or organization)"),
  repo: z.string().describe("GitHub repository name"),
  issue_number: z.number().int().min(1).describe("Issue number"),
});

export type GetGithubIssueInput = z.infer<typeof GetGithubIssueInput>;

interface GitHubLabel {
  name: string;
}

interface GitHubUser {
  login: string;
}

interface GitHubMilestone {
  title: string;
  number: number;
}

interface GitHubIssueDetail {
  number: number;
  title: string;
  body: string | null;
  state: string;
  labels: GitHubLabel[];
  assignees: GitHubUser[];
  milestone: GitHubMilestone | null;
  created_at: string;
  updated_at: string;
  html_url: string;
  user: GitHubUser;
}

export async function getGithubIssue(input: GetGithubIssueInput): Promise<unknown> {
  const { owner, repo, issue_number } = input;
  const client = new GitHubClient(getGitHubConfig());

  try {
    const issue = await client.get<GitHubIssueDetail>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issue_number}`
    );

    return {
      number: issue.number,
      title: issue.title,
      body: issue.body,
      state: issue.state,
      labels: issue.labels.map((l) => l.name),
      assignees: issue.assignees.map((a) => a.login),
      milestone: issue.milestone ? { title: issue.milestone.title, number: issue.milestone.number } : null,
      created_at: issue.created_at,
      updated_at: issue.updated_at,
      html_url: issue.html_url,
      user: issue.user.login,
    };
  } catch (err) {
    if (err instanceof GitHubError) {
      return { error: err.message, status: err.status };
    }
    throw err;
  }
}

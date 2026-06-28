import { z } from "zod";
import { GitHubClient } from "../../github/client.js";
import { getGitHubConfig } from "../../github/config.js";
import { handleGitHubError } from "./errors.js";

export const GetGithubIssueCommentsInput = z.object({
  owner: z.string().describe("GitHub repository owner (user or organization)"),
  repo: z.string().describe("GitHub repository name"),
  issue_number: z.number().int().min(1).describe("Issue number"),
  page: z.number().int().min(1).default(1).describe("Page number for pagination"),
  per_page: z.number().int().min(1).max(100).default(30).describe("Number of comments per page (max 100)"),
});

export type GetGithubIssueCommentsInput = z.infer<typeof GetGithubIssueCommentsInput>;

interface GitHubUser {
  login: string;
}

interface GitHubCommentItem {
  id: number;
  body: string;
  created_at: string;
  updated_at: string;
  user: GitHubUser;
}

export async function getGithubIssueComments(input: GetGithubIssueCommentsInput): Promise<unknown> {
  const { owner, repo, issue_number, page, per_page } = input;
  const client = new GitHubClient(getGitHubConfig());

  const params = new URLSearchParams({
    page: String(page),
    per_page: String(per_page),
  });

  try {
    const comments = await client.get<GitHubCommentItem[]>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issue_number}/comments?${params.toString()}`
    );

    return {
      returned: comments.length,
      comments: comments.map((c) => ({
        id: c.id,
        body: c.body,
        created_at: c.created_at,
        updated_at: c.updated_at,
        user: c.user.login,
      })),
    };
  } catch (err) {
    return handleGitHubError(err);
  }
}

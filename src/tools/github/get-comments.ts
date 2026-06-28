import { z } from "zod";
import { GitHubClient } from "../../github/client.js";
import { handleGitHubError } from "./errors.js";

export const GetGithubIssueCommentsInput = z.object({
  owner: z.string().describe("GitHub repository owner (user or organization)"),
  repo: z.string().describe("GitHub repository name"),
  issueNumber: z.number().int().min(1).describe("Issue number"),
  page: z.number().int().min(1).default(1).describe("Page number for pagination"),
  perPage: z.number().int().min(1).max(100).default(30).describe("Number of comments per page (max 100)"),
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

export async function getGithubIssueComments(client: GitHubClient, input: GetGithubIssueCommentsInput): Promise<unknown> {
  const { owner, repo, issueNumber, page, perPage } = input;

  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });

  try {
    const comments = await client.get<GitHubCommentItem[]>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}/comments?${params.toString()}`
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

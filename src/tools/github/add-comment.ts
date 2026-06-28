import { z } from "zod";
import { GitHubClient, GitHubError } from "../../github/client.js";
import { getGitHubConfig } from "../../github/config.js";

export const AddCommentToGithubIssueInput = z.object({
  owner: z.string().describe("GitHub repository owner (user or organization)"),
  repo: z.string().describe("GitHub repository name"),
  issue_number: z.number().int().min(1).describe("Issue number to comment on"),
  body: z.string().min(1).describe("Comment body (markdown supported)"),
});

export type AddCommentToGithubIssueInput = z.infer<typeof AddCommentToGithubIssueInput>;

interface GitHubUser {
  login: string;
}

interface GitHubComment {
  id: number;
  body: string;
  created_at: string;
  user: GitHubUser;
}

export async function addCommentToGithubIssue(input: AddCommentToGithubIssueInput): Promise<unknown> {
  const { owner, repo, issue_number, body } = input;
  const client = new GitHubClient(getGitHubConfig());

  try {
    const comment = await client.post<GitHubComment>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issue_number}/comments`,
      { body }
    );

    return {
      id: comment.id,
      body: comment.body,
      created_at: comment.created_at,
      user: comment.user.login,
    };
  } catch (err) {
    if (err instanceof GitHubError) {
      return { error: err.message, status: err.status, body: err.body };
    }
    throw err;
  }
}

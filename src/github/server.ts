import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ListGithubIssuesInput, listGithubIssues } from "../tools/github/list-issues.js";
import { GetGithubIssueInput, getGithubIssue } from "../tools/github/get-issue.js";
import { CreateGithubIssueInput, createGithubIssue } from "../tools/github/create-issue.js";
import { UpdateGithubIssueInput, updateGithubIssue } from "../tools/github/update-issue.js";
import { AddCommentToGithubIssueInput, addCommentToGithubIssue } from "../tools/github/add-comment.js";
import { GetGithubIssueCommentsInput, getGithubIssueComments } from "../tools/github/get-comments.js";

function registerTool<TInput>(
  server: McpServer,
  name: string,
  description: string,
  schema: { shape: Record<string, z.ZodTypeAny>; parse(input: unknown): TInput },
  handler: (input: TInput) => Promise<unknown>
): void {
  server.tool(name, description, schema.shape, async (args) => {
    const result = await handler(schema.parse(args));
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  });
}

export function registerGithubTools(server: McpServer): void {
  registerTool(
    server,
    "listGitHubIssues",
    "List issues in a GitHub repository with optional filters for state, labels, and pagination",
    ListGithubIssuesInput,
    listGithubIssues
  );

  registerTool(
    server,
    "getGitHubIssue",
    "Get a specific GitHub issue by number, including body, labels, assignees, and metadata",
    GetGithubIssueInput,
    getGithubIssue
  );

  registerTool(
    server,
    "createGitHubIssue",
    "Create a new GitHub issue in a repository",
    CreateGithubIssueInput,
    createGithubIssue
  );

  registerTool(
    server,
    "updateGitHubIssue",
    "Update a GitHub issue — change title, body, state (open/close), labels, assignees, or milestone",
    UpdateGithubIssueInput,
    updateGithubIssue
  );

  registerTool(
    server,
    "addCommentToGitHubIssue",
    "Add a comment to a GitHub issue",
    AddCommentToGithubIssueInput,
    addCommentToGithubIssue
  );

  registerTool(
    server,
    "getGitHubIssueComments",
    "Get comments on a GitHub issue with pagination support",
    GetGithubIssueCommentsInput,
    getGithubIssueComments
  );
}

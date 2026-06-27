import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ListGithubIssuesInput, listGithubIssues } from "../tools/github/list-issues.js";
import { GetGithubIssueInput, getGithubIssue } from "../tools/github/get-issue.js";
import { CreateGithubIssueInput, createGithubIssue } from "../tools/github/create-issue.js";
import { UpdateGithubIssueInput, updateGithubIssue } from "../tools/github/update-issue.js";
import { AddCommentToGithubIssueInput, addCommentToGithubIssue } from "../tools/github/add-comment.js";
import { GetGithubIssueCommentsInput, getGithubIssueComments } from "../tools/github/get-comments.js";

export function registerGithubTools(server: McpServer): void {
  server.tool(
    "listGithubIssues",
    "List issues in a GitHub repository with optional filters for state, labels, and pagination",
    ListGithubIssuesInput.shape,
    async (args) => {
      const result = await listGithubIssues(ListGithubIssuesInput.parse(args));
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "getGithubIssue",
    "Get a specific GitHub issue by number, including body, labels, assignees, and metadata",
    GetGithubIssueInput.shape,
    async (args) => {
      const result = await getGithubIssue(GetGithubIssueInput.parse(args));
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "createGithubIssue",
    "Create a new GitHub issue in a repository",
    CreateGithubIssueInput.shape,
    async (args) => {
      const result = await createGithubIssue(CreateGithubIssueInput.parse(args));
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "updateGithubIssue",
    "Update a GitHub issue — change title, body, state (open/close), labels, assignees, or milestone",
    UpdateGithubIssueInput.shape,
    async (args) => {
      const result = await updateGithubIssue(UpdateGithubIssueInput.parse(args));
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "addCommentToGithubIssue",
    "Add a comment to a GitHub issue",
    AddCommentToGithubIssueInput.shape,
    async (args) => {
      const result = await addCommentToGithubIssue(AddCommentToGithubIssueInput.parse(args));
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "getGithubIssueComments",
    "Get comments on a GitHub issue with pagination support",
    GetGithubIssueCommentsInput.shape,
    async (args) => {
      const result = await getGithubIssueComments(GetGithubIssueCommentsInput.parse(args));
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}

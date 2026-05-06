import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getJiraIssue, GetIssueInput } from "./tools/get-issue.js";
import { searchJiraIssuesUsingJql, SearchIssuesInput } from "./tools/search-issues.js";
import { createJiraIssue, CreateIssueInput } from "./tools/create-issue.js";
import { getJiraTransitions, GetTransitionsInput } from "./tools/get-transitions.js";
import { addCommentToJiraIssue, AddCommentInput } from "./tools/add-comment.js";
import { getJiraProjects, GetProjectsInput } from "./tools/get-projects.js";
import { transitionJiraIssue, TransitionIssueInput } from "./tools/transition-issue.js";
import { updateJiraIssue, UpdateIssueInput } from "./tools/update-issue.js";
import { editJiraIssueComment, EditCommentInput } from "./tools/edit-comment.js";
import { manageJiraIssueLabels, ManageLabelsInput, ManageLabelsInputShape } from "./tools/manage-labels.js";
import { addAttachmentToJiraIssue, AddAttachmentInput } from "./tools/add-attachment.js";
import { getJiraIssueComments, GetCommentsInput } from "./tools/get-comments.js";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "shoal",
    version: "0.1.0",
  });

  server.tool(
    "getJiraIssue",
    "Fetch a Jira issue by key. Returns all fields including custom fields (story points, etc.). " +
      "Use rawAdf: true on media-heavy issues that hang.",
    GetIssueInput.shape,
    async (args) => {
      const result = await getJiraIssue(GetIssueInput.parse(args));
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "searchJiraIssuesUsingJql",
    "Search Jira issues using JQL. Returns paginated results. " +
      "Use nextPageToken from the response to fetch subsequent pages.",
    SearchIssuesInput.shape,
    async (args) => {
      const result = await searchJiraIssuesUsingJql(SearchIssuesInput.parse(args));
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "createJiraIssue",
    "Create a Jira issue. Creates exactly one issue (no duplicates). " +
      "Specify components as names — they are serialized correctly. " +
      "Custom fields can be passed via customFields: { customfield_10016: 5 }.",
    CreateIssueInput.shape,
    async (args) => {
      const result = await createJiraIssue(CreateIssueInput.parse(args));
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "getJiraTransitions",
    "List available workflow transitions for a Jira issue. " +
      "Call this before transitionJiraIssue to discover valid transition IDs and target statuses.",
    GetTransitionsInput.shape,
    async (args) => {
      const result = await getJiraTransitions(GetTransitionsInput.parse(args));
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "addCommentToJiraIssue",
    "Add a comment to a Jira issue. Supports @mentions via proper ADF mention nodes " +
      "(fixes Atlassian bug #136 where mentions are downgraded to plain text).",
    AddCommentInput.shape,
    async (args) => {
      const result = await addCommentToJiraIssue(AddCommentInput.parse(args));
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "getJiraProjects",
    "List accessible Jira projects with pagination. " +
      "Use nextStartAt from the response to fetch subsequent pages.",
    GetProjectsInput.shape,
    async (args) => {
      const result = await getJiraProjects(GetProjectsInput.parse(args));
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "transitionJiraIssue",
    "Move a Jira issue through its workflow states using a transition ID. " +
      "Call getJiraTransitions first to discover valid IDs. " +
      "Set clearResolution: true when reopening an issue to prevent transition errors (fixes Atlassian bug #85).",
    TransitionIssueInput.shape,
    async (args) => {
      const result = await transitionJiraIssue(TransitionIssueInput.parse(args));
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "updateJiraIssue",
    "Update fields on an existing Jira issue. " +
      "Supports summary, description (plain text auto-wrapped in ADF), priority, assignee, labels, components, and custom fields. " +
      "Only the fields you provide are changed — omitted fields are left untouched.",
    UpdateIssueInput.shape,
    async (args) => {
      const result = await updateJiraIssue(UpdateIssueInput.parse(args));
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "editJiraIssueComment",
    "Edit an existing comment on a Jira issue. " +
      "Rewrites the comment body using ADF so formatting is preserved.",
    EditCommentInput.shape,
    async (args) => {
      const result = await editJiraIssueComment(EditCommentInput.parse(args));
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "manageJiraIssueLabels",
    "Add or remove labels on a Jira issue without needing the full current label set. " +
      "Provide add and/or remove arrays — only the specified labels are changed.",
    ManageLabelsInputShape,
    async (args) => {
      const result = await manageJiraIssueLabels(ManageLabelsInput.parse(args));
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "addAttachmentToJiraIssue",
    "Attach a file to a Jira issue. " +
      "Provide base64-encoded file content along with the filename and optional MIME type.",
    AddAttachmentInput.shape,
    async (args) => {
      const result = await addAttachmentToJiraIssue(AddAttachmentInput.parse(args));
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "getJiraIssueComments",
    "Fetch comments on a Jira issue with pagination (fixes Atlassian gap #88). " +
      "Returns rendered plain text from ADF bodies. Use nextStartAt to page through results.",
    GetCommentsInput.shape,
    async (args) => {
      const result = await getJiraIssueComments(GetCommentsInput.parse(args));
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  return server;
}

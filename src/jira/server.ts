import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { JiraClient } from "./client.js";
import { getJiraIssue, GetIssueInput } from "../tools/get-issue.js";
import { searchJiraIssuesUsingJql, SearchIssuesInput } from "../tools/search-issues.js";
import { createJiraIssue, CreateIssueInput } from "../tools/create-issue.js";
import { getJiraTransitions, GetTransitionsInput } from "../tools/get-transitions.js";
import { addCommentToJiraIssue, AddCommentInput } from "../tools/add-comment.js";
import { getJiraProjects, GetProjectsInput } from "../tools/get-projects.js";
import { transitionJiraIssue, TransitionIssueInput } from "../tools/transition-issue.js";
import { updateJiraIssue, UpdateIssueInput } from "../tools/update-issue.js";
import { editJiraIssueComment, EditCommentInput } from "../tools/edit-comment.js";
import { manageJiraIssueLabels, ManageLabelsInput, ManageLabelsInputShape } from "../tools/manage-labels.js";
import { addAttachmentToJiraIssue, AddAttachmentInput } from "../tools/add-attachment.js";
import { getJiraIssueComments, GetCommentsInput } from "../tools/get-comments.js";
import { createJiraIssueLink, CreateIssueLinkInput } from "../tools/create-issue-link.js";
import { getJiraIssueLinkTypes, GetIssueLinkTypesInput } from "../tools/get-issue-link-types.js";
import { createJiraEpic, CreateEpicInput } from "../tools/create-epic.js";
import { assignIssueToEpic, AssignToEpicInput } from "../tools/assign-to-epic.js";

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

export function registerJiraTools(server: McpServer): void {
  const client = new JiraClient();

  registerTool(
    server,
    "getJiraIssue",
    "Fetch a Jira issue by key. Returns all fields including custom fields (story points, etc.). " +
      "Use rawAdf: true on media-heavy issues that hang.",
    GetIssueInput,
    (input) => getJiraIssue(input, client)
  );

  registerTool(
    server,
    "searchJiraIssuesUsingJql",
    "Search Jira issues using JQL. Returns paginated results. " +
      "Use nextPageToken from the response to fetch subsequent pages.",
    SearchIssuesInput,
    (input) => searchJiraIssuesUsingJql(input, client)
  );

  registerTool(
    server,
    "createJiraIssue",
    "Create a Jira issue. Creates exactly one issue (no duplicates). " +
      "Specify components as names — they are serialized correctly. " +
      "Custom fields can be passed via customFields: { customfield_10016: 5 }.",
    CreateIssueInput,
    (input) => createJiraIssue(input, client)
  );

  registerTool(
    server,
    "getJiraTransitions",
    "List available workflow transitions for a Jira issue. " +
      "Call this before transitionJiraIssue to discover valid transition IDs and target statuses.",
    GetTransitionsInput,
    (input) => getJiraTransitions(input, client)
  );

  registerTool(
    server,
    "addCommentToJiraIssue",
    "Add a comment to a Jira issue. Supports @mentions via proper ADF mention nodes " +
      "(fixes Atlassian bug #136 where mentions are downgraded to plain text).",
    AddCommentInput,
    (input) => addCommentToJiraIssue(input, client)
  );

  registerTool(
    server,
    "getJiraProjects",
    "List accessible Jira projects with pagination. " +
      "Use nextStartAt from the response to fetch subsequent pages.",
    GetProjectsInput,
    (input) => getJiraProjects(input, client)
  );

  registerTool(
    server,
    "transitionJiraIssue",
    "Move a Jira issue through its workflow states using a transition ID. " +
      "Call getJiraTransitions first to discover valid IDs. " +
      "Set clearResolution: true when reopening an issue to prevent transition errors (fixes Atlassian bug #85).",
    TransitionIssueInput,
    (input) => transitionJiraIssue(input, client)
  );

  registerTool(
    server,
    "updateJiraIssue",
    "Update fields on an existing Jira issue. " +
      "Supports summary, description (plain text auto-wrapped in ADF), priority, assignee, labels, components, and custom fields. " +
      "Only the fields you provide are changed — omitted fields are left untouched.",
    UpdateIssueInput,
    (input) => updateJiraIssue(input, client)
  );

  registerTool(
    server,
    "editJiraIssueComment",
    "Edit an existing comment on a Jira issue. " +
      "Rewrites the comment body using ADF so formatting is preserved.",
    EditCommentInput,
    (input) => editJiraIssueComment(input, client)
  );

  registerTool(
    server,
    "manageJiraIssueLabels",
    "Add or remove labels on a Jira issue without needing the full current label set. " +
      "Provide add and/or remove arrays — only the specified labels are changed.",
    { shape: ManageLabelsInputShape, parse: (args: unknown) => ManageLabelsInput.parse(args) },
    (input) => manageJiraIssueLabels(input, client)
  );

  registerTool(
    server,
    "addAttachmentToJiraIssue",
    "Attach a file to a Jira issue. " +
      "Provide base64-encoded file content along with the filename and optional MIME type.",
    AddAttachmentInput,
    (input) => addAttachmentToJiraIssue(input, client)
  );

  registerTool(
    server,
    "getJiraIssueComments",
    "Fetch comments on a Jira issue with pagination (fixes Atlassian gap #88). " +
      "Returns rendered plain text from ADF bodies. Use nextStartAt to page through results.",
    GetCommentsInput,
    (input) => getJiraIssueComments(input, client)
  );

  registerTool(
    server,
    "getJiraIssueLinkTypes",
    "List all issue link types configured in this Jira instance (e.g. Blocks, Relates, Duplicate). " +
      "Call this before createJiraIssueLink to discover valid link type names.",
    GetIssueLinkTypesInput,
    (_input) => getJiraIssueLinkTypes(client)
  );

  registerTool(
    server,
    "createJiraIssueLink",
    "Create a link between two Jira issues (e.g. 'PROJ-1 blocks PROJ-2'). " +
      "Call getJiraIssueLinkTypes first to discover valid link type names for your instance. " +
      "The inward/outward distinction follows the link type's directional labels.",
    CreateIssueLinkInput,
    (input) => createJiraIssueLink(input, client)
  );

  registerTool(
    server,
    "createJiraEpic",
    "Create a Jira epic directly — this is the discoverable shortcut for epic creation, " +
      "equivalent to createJiraIssue with issueType: 'Epic' but locked to the correct issue type. " +
      "Pass epicName for classic projects (sets the epic chip label, customfield_10011); " +
      "next-gen projects don't need it.",
    CreateEpicInput,
    (input) => createJiraEpic(input, client)
  );

  registerTool(
    server,
    "assignIssueToEpic",
    "Assign an existing issue to an epic — the discoverable shortcut for setting an issue's parent epic. " +
      "Tries the modern parent field first (next-gen and modern classic projects); if the instance rejects " +
      "it, automatically falls back to the legacy Epic Link field (customfield_10014) used by older classic " +
      "projects, so callers don't need to know which model their project uses.",
    AssignToEpicInput,
    (input) => assignIssueToEpic(input, client)
  );
}

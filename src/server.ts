import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getJiraIssue, GetIssueInput } from "./tools/get-issue.js";
import { searchJiraIssuesUsingJql, SearchIssuesInput } from "./tools/search-issues.js";
import { createJiraIssue, CreateIssueInput } from "./tools/create-issue.js";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "moth",
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
    "Search Jira issues using JQL. Returns paginated results with total count and next offset. " +
      "Use nextStartAt from the response to fetch subsequent pages.",
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

  return server;
}

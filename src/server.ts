import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { version } from "./config.js";
import { registerJiraTools } from "./jira/server.js";

export function createMcpServer(): McpServer {
  const server = new McpServer({ name: "shoal", version });
  registerJiraTools(server);
  return server;
}

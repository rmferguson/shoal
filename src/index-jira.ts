import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getJiraConfig } from "./jira/config.js";
import { registerJiraTools } from "./jira/server.js";
import pkg from "../package.json" with { type: "json" };

getJiraConfig();
const server = new McpServer({ name: "shoal-jira", version: pkg.version });
registerJiraTools(server);
const transport = new StdioServerTransport();
await server.connect(transport);

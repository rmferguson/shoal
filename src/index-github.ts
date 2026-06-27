import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getGitHubConfig } from "./github/config.js";
import { registerGithubTools } from "./github/server.js";
import pkg from "../package.json" with { type: "json" };

getGitHubConfig();
const server = new McpServer({ name: "shoal-github", version: pkg.version });
registerGithubTools(server);
const transport = new StdioServerTransport();
await server.connect(transport);

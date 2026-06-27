import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { tryGetJiraConfig } from "./jira/config.js";
import { tryGetGitHubConfig } from "./github/config.js";
import { registerJiraTools } from "./jira/server.js";
import { registerGithubTools } from "./github/server.js";
import pkg from "../package.json" with { type: "json" };

const jiraConfig = tryGetJiraConfig();
const githubConfig = tryGetGitHubConfig();

if (!jiraConfig && !githubConfig) {
  process.stderr.write(
    "Error: shoal requires at least one provider configured.\n" +
    "  For Jira: set JIRA_SITE_URL, ATLASSIAN_USER_EMAIL, ATLASSIAN_API_TOKEN\n" +
    "  For GitHub Issues: set GITHUB_TOKEN\n"
  );
  process.exit(1);
}

const server = new McpServer({ name: "shoal", version: pkg.version });
if (jiraConfig) registerJiraTools(server);
if (githubConfig) registerGithubTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);

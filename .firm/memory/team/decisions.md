# Team Decisions

## Architecture
- Local stdio MCP server only — no hosted/multi-tenant service, no HTTP/SSE transport
- Two providers: Jira Cloud REST API v3 and GitHub Issues; each is independently runnable
- Single POST for issue creation — no retry logic (avoids Atlassian double-create bug #132)
- Full field passthrough — never filter `customfield_*` values from Jira responses

## Conventions
- Stack: TypeScript / Node.js 22, @modelcontextprotocol/sdk, Zod, Vitest
- Tracker: GitHub Issues (https://github.com/rmferguson/shoal/issues)
- JSON tool: jq

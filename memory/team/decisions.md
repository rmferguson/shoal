# Team Decisions

## Architecture
- Remote HTTP server with StreamableHTTP MCP transport — not stdio, not local
- Stateless MCP endpoint: new McpServer + transport per POST /mcp request
- Multi-tenant OAuth 2.0 3LO — each user authorizes against their own Atlassian org
- In-memory token store for dev; persistent store required before production deploy

## Conventions
- All Jira tools take `sessionId` as first parameter — passed to JiraClient for token lookup
- Zod schemas are exported alongside tool functions for registration in server.ts
- Error returns are plain objects `{ error: string, status?: number }` — never throw from tool functions
- ADF wrapping is always required for write operations — never pass plain strings as descriptions or comment bodies
- Single POST for issue creation — no retry, no idempotency key needed

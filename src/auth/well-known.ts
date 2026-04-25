import { Router } from "express";
import { config } from "../config.js";

export const wellKnownRouter = Router();

// RFC 9728 — OAuth Protected Resource Metadata
// https://www.rfc-editor.org/rfc/rfc9728
// MCP clients use this to discover the correct authorization server.
// Atlassian's server omits this endpoint, causing auth to break differently
// across Cursor, VS Code, and Gemini CLI (issue #148).
wellKnownRouter.get("/oauth-protected-resource", (_req, res) => {
  res.json({
    resource: config.publicUrl,
    authorization_servers: ["https://auth.atlassian.com"],
    scopes_supported: [
      "read:jira-work",
      "write:jira-work",
      "read:jira-user",
      "offline_access",
    ],
    bearer_methods_supported: ["header"],
  });
});

import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { oauthRouter } from "./auth/oauth.js";
import { wellKnownRouter } from "./auth/well-known.js";
import { createMcpServer } from "./server.js";
import { config } from "./config.js";

const app = express();
app.use(express.json());

// RFC 9728 — OAuth resource metadata (fixes multi-client auth, issue #148).
app.use("/.well-known", wellKnownRouter);

// OAuth 2.0 3LO flow.
app.use("/auth", oauthRouter);

// MCP endpoint — one transport per request (stateless HTTP).
app.post("/mcp", async (req, res) => {
  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
  await server.close();
});

// Health check.
app.get("/health", (_req, res) => {
  res.json({ status: "ok", version: "0.1.0" });
});

app.listen(config.port, () => {
  console.log(`shoal listening on ${config.publicUrl}`);
});

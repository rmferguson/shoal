import { Router } from "express";
import { config } from "../config.js";
import { saveTokens } from "./tokens.js";

// Temporary state store for CSRF protection (sessionId -> state nonce).
const pendingStates = new Map<string, string>();

export const oauthRouter = Router();

// GET /auth/login?session=<sessionId>
// Redirects the user to Atlassian's OAuth consent page.
oauthRouter.get("/login", (req, res) => {
  const sessionId = String(req.query["session"] ?? "");
  if (!sessionId) {
    res.status(400).send("Missing session parameter.");
    return;
  }

  const state = `${sessionId}:${crypto.randomUUID()}`;
  pendingStates.set(sessionId, state);

  const params = new URLSearchParams({
    audience: "api.atlassian.com",
    client_id: config.atlassian.clientId,
    scope: config.atlassian.scopes,
    redirect_uri: `${config.publicUrl}/auth/callback`,
    state,
    response_type: "code",
    prompt: "consent",
  });

  res.redirect(`${config.atlassian.authUrl}?${params.toString()}`);
});

// GET /auth/callback?code=<code>&state=<state>
// Exchanges authorization code for tokens, fetches accessible Atlassian resources.
oauthRouter.get("/callback", async (req, res) => {
  const code = String(req.query["code"] ?? "");
  const state = String(req.query["state"] ?? "");
  const error = req.query["error"];

  if (error) {
    res.status(400).send(`OAuth error: ${error} — ${req.query["error_description"] ?? ""}`);
    return;
  }

  if (!code || !state) {
    res.status(400).send("Missing code or state.");
    return;
  }

  // Validate state / extract sessionId.
  const sessionId = state.split(":")[0];
  if (!sessionId || pendingStates.get(sessionId) !== state) {
    res.status(400).send("Invalid state parameter.");
    return;
  }
  pendingStates.delete(sessionId);

  try {
    // Exchange code for tokens.
    const tokenResp = await fetch(config.atlassian.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: config.atlassian.clientId,
        client_secret: config.atlassian.clientSecret,
        code,
        redirect_uri: `${config.publicUrl}/auth/callback`,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!tokenResp.ok) {
      const text = await tokenResp.text();
      res.status(502).send(`Token exchange failed: ${text}`);
      return;
    }

    const tokenData = (await tokenResp.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    // Fetch accessible Atlassian resources to get cloudId and siteUrl.
    const resourcesResp = await fetch(
      "https://api.atlassian.com/oauth/token/accessible-resources",
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (!resourcesResp.ok) {
      const text = await resourcesResp.text();
      res.status(502).send(`Failed to fetch Atlassian resources: ${text}`);
      return;
    }

    const resources = (await resourcesResp.json()) as Array<{
      id: string;
      url: string;
      name: string;
    }>;

    if (!resources.length) {
      res.status(400).send("No accessible Atlassian sites found for this account.");
      return;
    }

    // Use first accessible site (user can override via config later).
    const site = resources[0]!;

    saveTokens(sessionId, {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: Date.now() + tokenData.expires_in * 1000,
      cloudId: site.id,
      siteUrl: site.url,
    });

    res.send(
      `<html><body><p>Connected to <strong>${site.name}</strong> (${site.url}). You can close this tab.</p></body></html>`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).send(`Internal error: ${message}`);
  }
});

import { config } from "../config.js";

export interface TokenSet {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // unix ms
  cloudId: string;
  siteUrl: string;
}

// In-memory store keyed by sessionId. Replace with DB for production.
const store = new Map<string, TokenSet>();

export function saveTokens(sessionId: string, tokens: TokenSet): void {
  store.set(sessionId, tokens);
}

export function getTokens(sessionId: string): TokenSet | undefined {
  return store.get(sessionId);
}

export function deleteTokens(sessionId: string): void {
  store.delete(sessionId);
}

export function isExpired(tokens: TokenSet): boolean {
  return Date.now() >= tokens.expiresAt - 60_000; // 60s buffer
}

export async function refreshTokens(sessionId: string): Promise<TokenSet> {
  const existing = store.get(sessionId);
  if (!existing) throw new Error("No tokens for session");

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: config.atlassian.clientId,
    client_secret: config.atlassian.clientSecret,
    refresh_token: existing.refreshToken,
  });

  const resp = await fetch(config.atlassian.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal: AbortSignal.timeout(10_000),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Token refresh failed ${resp.status}: ${text}`);
  }

  const data = (await resp.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  const refreshed: TokenSet = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? existing.refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
    cloudId: existing.cloudId,
    siteUrl: existing.siteUrl,
  };

  store.set(sessionId, refreshed);
  return refreshed;
}

export async function getValidTokens(sessionId: string): Promise<TokenSet> {
  const tokens = store.get(sessionId);
  if (!tokens) throw new Error("Not authenticated. Complete OAuth flow first.");
  if (isExpired(tokens)) return refreshTokens(sessionId);
  return tokens;
}

import { config } from "../config.js";
import { createTokenStore } from "./token-store.js";

export interface TokenSet {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // unix ms
  cloudId: string;
  siteUrl: string;
}

// Store backend — selectable via TOKEN_STORE env var (memory | redis).
const store = createTokenStore();

export async function saveTokens(sessionId: string, tokens: TokenSet): Promise<void> {
  await store.set(sessionId, JSON.stringify(tokens), 90 * 24 * 3600);
}

/** Returns tokens for the session, or undefined if the session is not authenticated. */
export async function getTokens(sessionId: string): Promise<TokenSet | undefined> {
  const raw = await store.get(sessionId);
  return raw ? (JSON.parse(raw) as TokenSet) : undefined;
}

export async function deleteTokens(sessionId: string): Promise<void> {
  await store.delete(sessionId);
}

export function isExpired(tokens: TokenSet): boolean {
  return Date.now() >= tokens.expiresAt - 60_000; // 60s buffer
}

export async function refreshTokens(sessionId: string): Promise<TokenSet> {
  const existing = await getTokens(sessionId);
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

  await saveTokens(sessionId, refreshed);
  return refreshed;
}

export async function getValidTokens(sessionId: string): Promise<TokenSet> {
  const tokens = await getTokens(sessionId);
  if (!tokens) throw new Error("Not authenticated. Complete OAuth flow first.");
  if (isExpired(tokens)) {
    try {
      return await refreshTokens(sessionId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Session expired and token refresh failed. Please re-authenticate. (${msg})`);
    }
  }
  return tokens;
}

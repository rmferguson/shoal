const required = (name: string): string => {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
};

const optional = (name: string, fallback: string): string =>
  process.env[name] ?? fallback;

export const config = {
  port: parseInt(optional("PORT", "3000"), 10),
  publicUrl: optional("PUBLIC_URL", "http://localhost:3000"),

  atlassian: {
    clientId: optional("ATLASSIAN_CLIENT_ID", ""),
    clientSecret: optional("ATLASSIAN_CLIENT_SECRET", ""),
    authUrl: "https://auth.atlassian.com/authorize",
    tokenUrl: "https://auth.atlassian.com/oauth/token",
    scopes: [
      "read:jira-work",
      "write:jira-work",
      "read:jira-user",
      "offline_access",
    ].join(" "),
  },

  jira: {
    apiBase: "https://api.atlassian.com",
    requestTimeoutMs: 10_000,
  },

  tokenStore: (process.env.TOKEN_STORE ?? "memory") as "memory" | "redis",
  redis: {
    url: process.env.REDIS_URL ?? "redis://localhost:6379",
  },
} as const;

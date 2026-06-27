import pkg from "../../package.json" with { type: "json" };

export interface JiraConfig {
  version: string;
  siteUrl: string;
  email: string;
  apiToken: string;
  requestTimeoutMs: number;
}

const required = (name: string): string => {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
};

export function getJiraConfig(): JiraConfig {
  return {
    version: pkg.version,
    siteUrl: required("JIRA_SITE_URL").replace(/\/$/, ""),
    email: required("ATLASSIAN_USER_EMAIL"),
    apiToken: required("ATLASSIAN_API_TOKEN"),
    requestTimeoutMs: 10_000,
  };
}

export function tryGetJiraConfig(): JiraConfig | null {
  const siteUrl = process.env["JIRA_SITE_URL"];
  const email = process.env["ATLASSIAN_USER_EMAIL"];
  const apiToken = process.env["ATLASSIAN_API_TOKEN"];
  if (!siteUrl || !email || !apiToken) return null;
  return {
    version: pkg.version,
    siteUrl: siteUrl.replace(/\/$/, ""),
    email,
    apiToken,
    requestTimeoutMs: 10_000,
  };
}

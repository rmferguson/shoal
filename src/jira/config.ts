import pkg from "../../package.json" with { type: "json" };

export interface JiraConfig {
  version: string;
  siteUrl: string;
  email: string;
  apiToken: string;
  requestTimeoutMs: number;
}

const REQUEST_TIMEOUT_MS = 10_000;

const required = (name: string): string => {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
};

const buildConfig = (siteUrl: string, email: string, apiToken: string): JiraConfig => ({
  version: pkg.version,
  siteUrl: siteUrl.replace(/\/$/, ""),
  email,
  apiToken,
  requestTimeoutMs: REQUEST_TIMEOUT_MS,
});

export function getJiraConfig(): JiraConfig {
  return buildConfig(
    required("JIRA_SITE_URL"),
    required("ATLASSIAN_USER_EMAIL"),
    required("ATLASSIAN_API_TOKEN")
  );
}

export function tryGetJiraConfig(): JiraConfig | null {
  const siteUrl = process.env["JIRA_SITE_URL"];
  const email = process.env["ATLASSIAN_USER_EMAIL"];
  const apiToken = process.env["ATLASSIAN_API_TOKEN"];
  if (!siteUrl || !email || !apiToken) return null;
  return buildConfig(siteUrl, email, apiToken);
}

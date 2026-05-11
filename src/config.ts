import pkg from "../package.json" with { type: "json" };
const { version } = pkg;

const required = (name: string): string => {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
};

export const config = {
  version,
  jira: {
    siteUrl: required("JIRA_SITE_URL").replace(/\/$/, ""),
    email: required("ATLASSIAN_USER_EMAIL"),
    apiToken: required("ATLASSIAN_API_TOKEN"),
    requestTimeoutMs: 10_000,
  },
} as const;

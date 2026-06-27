export interface GitHubConfig {
  token: string;
  requestTimeoutMs: number;
}

const required = (name: string): string => {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
};

export function getGitHubConfig(): GitHubConfig {
  return {
    token: required("GITHUB_TOKEN"),
    requestTimeoutMs: 10_000,
  };
}

export function tryGetGitHubConfig(): GitHubConfig | null {
  const token = process.env["GITHUB_TOKEN"];
  if (!token) return null;
  return { token, requestTimeoutMs: 10_000 };
}

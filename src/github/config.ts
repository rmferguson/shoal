export interface GitHubConfig {
  token: string;
  requestTimeoutMs: number;
}

const REQUEST_TIMEOUT_MS = 10_000;

const requireEnv = (name: string): string => {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
};

const buildConfig = (token: string): GitHubConfig => ({
  token,
  requestTimeoutMs: REQUEST_TIMEOUT_MS,
});

export function getGitHubConfig(): GitHubConfig {
  return buildConfig(requireEnv("GITHUB_TOKEN"));
}

export function tryGetGitHubConfig(): GitHubConfig | null {
  const token = process.env["GITHUB_TOKEN"];
  if (!token) return null;
  return buildConfig(token);
}

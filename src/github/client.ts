import { GitHubConfig } from "./config.js";

export class GitHubError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: string
  ) {
    super(message);
    this.name = "GitHubError";
  }
}

export class GitHubClient {
  private readonly token: string;
  private readonly timeoutMs: number;

  constructor(cfg: GitHubConfig) {
    this.token = cfg.token;
    this.timeoutMs = cfg.requestTimeoutMs;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `https://api.github.com${path}`;
    const init: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      signal: AbortSignal.timeout(this.timeoutMs),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    };

    const response = await fetch(url, init);

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new GitHubError(
        `GitHub API ${response.status} ${response.statusText}: ${path}`,
        response.status,
        text
      );
    }

    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("PATCH", path, body);
  }
}

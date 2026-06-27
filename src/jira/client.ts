import { getJiraConfig, JiraConfig } from "./config.js";

export class JiraError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: string
  ) {
    super(message);
    this.name = "JiraError";
  }
}

export class JiraClient {
  private readonly basicAuth: string;
  private readonly cfg: JiraConfig;

  constructor(cfg?: JiraConfig) {
    this.cfg = cfg ?? getJiraConfig();
    this.basicAuth = Buffer.from(`${this.cfg.email}:${this.cfg.apiToken}`).toString("base64");
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.cfg.siteUrl}/rest/api/3${path}`;

    const init: RequestInit = {
      method,
      headers: {
        Authorization: `Basic ${this.basicAuth}`,
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      signal: AbortSignal.timeout(this.cfg.requestTimeoutMs),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    };

    const resp = await fetch(url, init);

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new JiraError(
        `Jira API ${resp.status} ${resp.statusText}: ${path}`,
        resp.status,
        text
      );
    }

    if (resp.status === 204) return undefined as T;
    return resp.json() as Promise<T>;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("PUT", path, body);
  }

  async upload<T>(path: string, form: FormData): Promise<T> {
    const url = `${this.cfg.siteUrl}/rest/api/3${path}`;

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${this.basicAuth}`,
        Accept: "application/json",
        "X-Atlassian-Token": "no-check",
      },
      body: form,
      signal: AbortSignal.timeout(this.cfg.requestTimeoutMs),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new JiraError(
        `Jira API ${resp.status} ${resp.statusText}: ${path}`,
        resp.status,
        text
      );
    }

    return resp.json() as Promise<T>;
  }
}

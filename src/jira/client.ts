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
  private readonly config: JiraConfig;

  constructor(config?: JiraConfig) {
    this.config = config ?? getJiraConfig();
    this.basicAuth = Buffer.from(`${this.config.email}:${this.config.apiToken}`).toString("base64");
  }

  private async checkResponse(response: Response, path: string): Promise<void> {
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new JiraError(
        `Jira API ${response.status} ${response.statusText}: ${path}`,
        response.status,
        text
      );
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.config.siteUrl}/rest/api/3${path}`;

    const init: RequestInit = {
      method,
      headers: {
        Authorization: `Basic ${this.basicAuth}`,
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      signal: AbortSignal.timeout(this.config.requestTimeoutMs),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    };

    const response = await fetch(url, init);

    await this.checkResponse(response, path);

    const text = await response.text();
    if (text.length === 0) return undefined as T;
    return JSON.parse(text) as T;
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
    const url = `${this.config.siteUrl}/rest/api/3${path}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${this.basicAuth}`,
        Accept: "application/json",
        "X-Atlassian-Token": "no-check",
      },
      body: form,
      signal: AbortSignal.timeout(this.config.requestTimeoutMs),
    });

    await this.checkResponse(response, path);

    return response.json() as Promise<T>;
  }
}

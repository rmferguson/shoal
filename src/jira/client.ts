import { config } from "../config.js";
import { getValidTokens } from "../auth/tokens.js";

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
  constructor(private readonly sessionId: string) {}

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const tokens = await getValidTokens(this.sessionId);
    const url = `${config.jira.apiBase}/ex/jira/${tokens.cloudId}/rest/api/3${path}`;

    const init: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      signal: AbortSignal.timeout(config.jira.requestTimeoutMs),
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

  // Multipart upload (for attachments).
  async upload<T>(path: string, form: FormData): Promise<T> {
    const tokens = await getValidTokens(this.sessionId);
    const url = `${config.jira.apiBase}/ex/jira/${tokens.cloudId}/rest/api/3${path}`;

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        Accept: "application/json",
        "X-Atlassian-Token": "no-check",
      },
      body: form,
      signal: AbortSignal.timeout(30_000),
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

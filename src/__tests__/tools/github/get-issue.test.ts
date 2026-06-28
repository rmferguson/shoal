import { describe, it, expect, vi, beforeEach } from "vitest";
import { GitHubClient } from "../../../github/client.js";
import { getGithubIssue } from "../../../tools/github/get-issue.js";

beforeEach(() => vi.restoreAllMocks());

const client = new GitHubClient({ token: "test-token", requestTimeoutMs: 5000 });

function stubFetch(body: unknown, status = 200) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  }));
}

function makeIssueDetail(overrides: Record<string, unknown> = {}) {
  return {
    number: 7,
    title: "Improve docs",
    body: "We should update the README.",
    state: "open",
    labels: [{ name: "docs" }],
    assignees: [{ login: "bob" }],
    milestone: { title: "v2.0", number: 3 },
    created_at: "2026-02-01T00:00:00Z",
    updated_at: "2026-02-02T00:00:00Z",
    html_url: "https://github.com/owner/repo/issues/7",
    user: { login: "carol" },
    ...overrides,
  };
}

describe("getGithubIssue", () => {
  it("returns mapped issue detail", async () => {
    stubFetch(makeIssueDetail());
    const result = await getGithubIssue(client, { owner: "owner", repo: "repo", issueNumber: 7 }) as Record<string, unknown>;
    expect(result.number).toBe(7);
    expect(result.title).toBe("Improve docs");
    expect(result.body).toBe("We should update the README.");
    expect(result.state).toBe("open");
    expect(result.labels).toEqual(["docs"]);
    expect(result.assignees).toEqual(["bob"]);
    expect(result.user).toBe("carol");
  });

  it("maps milestone to title and number", async () => {
    stubFetch(makeIssueDetail());
    const result = await getGithubIssue(client, { owner: "owner", repo: "repo", issueNumber: 7 }) as Record<string, unknown>;
    const milestone = result.milestone as Record<string, unknown>;
    expect(milestone.title).toBe("v2.0");
    expect(milestone.number).toBe(3);
  });

  it("returns null milestone when absent", async () => {
    stubFetch(makeIssueDetail({ milestone: null }));
    const result = await getGithubIssue(client, { owner: "owner", repo: "repo", issueNumber: 7 }) as Record<string, unknown>;
    expect(result.milestone).toBeNull();
  });

  it("returns error and status on GitHubError", async () => {
    stubFetch({ message: "Not Found" }, 404);
    const result = await getGithubIssue(client, { owner: "owner", repo: "repo", issueNumber: 9999 }) as Record<string, unknown>;
    expect(result.error).toBeDefined();
    expect(result.status).toBe(404);
  });

  it("throws on network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connection refused")));
    await expect(getGithubIssue(client, { owner: "owner", repo: "repo", issueNumber: 7 })).rejects.toThrow("connection refused");
  });
});

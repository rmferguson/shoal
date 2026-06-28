import { describe, it, expect, vi, beforeEach } from "vitest";
import { GitHubClient } from "../../../github/client.js";
import { getGithubIssueComments } from "../../../tools/github/get-comments.js";

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

function makeComment(overrides: Record<string, unknown> = {}) {
  return {
    id: 101,
    body: "Looks good!",
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T01:00:00Z",
    user: { login: "frank" },
    ...overrides,
  };
}

describe("getGithubIssueComments", () => {
  it("returns comment list with mapped fields", async () => {
    stubFetch([makeComment()]);
    const result = await getGithubIssueComments(client, { owner: "owner", repo: "repo", issue_number: 3, page: 1, per_page: 30 }) as Record<string, unknown>;
    expect(result.returned).toBe(1);
    const comments = result.comments as Record<string, unknown>[];
    expect(comments).toHaveLength(1);
    expect(comments[0].id).toBe(101);
    expect(comments[0].body).toBe("Looks good!");
    expect(comments[0].created_at).toBe("2026-04-01T00:00:00Z");
    expect(comments[0].updated_at).toBe("2026-04-01T01:00:00Z");
    expect(comments[0].user).toBe("frank");
  });

  it("returns empty list when no comments", async () => {
    stubFetch([]);
    const result = await getGithubIssueComments(client, { owner: "owner", repo: "repo", issue_number: 3, page: 1, per_page: 30 }) as Record<string, unknown>;
    expect(result.returned).toBe(0);
    expect(result.comments).toEqual([]);
  });

  it("returns error and status on GitHubError", async () => {
    stubFetch({ message: "Not Found" }, 404);
    const result = await getGithubIssueComments(client, { owner: "owner", repo: "repo", issue_number: 9999, page: 1, per_page: 30 }) as Record<string, unknown>;
    expect(result.error).toBeDefined();
    expect(result.status).toBe(404);
  });

  it("throws on network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("DNS lookup failed")));
    await expect(getGithubIssueComments(client, { owner: "owner", repo: "repo", issue_number: 3, page: 1, per_page: 30 })).rejects.toThrow("DNS lookup failed");
  });

  it("handles multiple comments", async () => {
    stubFetch([makeComment({ id: 1, user: { login: "alice" } }), makeComment({ id: 2, user: { login: "bob" } })]);
    const result = await getGithubIssueComments(client, { owner: "owner", repo: "repo", issue_number: 3, page: 1, per_page: 30 }) as Record<string, unknown>;
    expect(result.returned).toBe(2);
    const comments = result.comments as Record<string, unknown>[];
    expect(comments[0].user).toBe("alice");
    expect(comments[1].user).toBe("bob");
  });
});

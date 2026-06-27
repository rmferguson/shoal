import { describe, it, expect, vi, beforeEach } from "vitest";
import { listGithubIssues } from "../../../tools/github/list-issues.js";

beforeEach(() => vi.restoreAllMocks());

function stubFetch(body: unknown, status = 200) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  }));
}

function makeIssue(overrides: Record<string, unknown> = {}) {
  return {
    number: 42,
    title: "Fix the bug",
    state: "open",
    labels: [{ name: "bug" }, { name: "priority-high" }],
    assignees: [{ login: "alice" }],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
    html_url: "https://github.com/owner/repo/issues/42",
    ...overrides,
  };
}

describe("listGithubIssues", () => {
  it("returns issue list with mapped fields", async () => {
    stubFetch([makeIssue()]);
    const result = await listGithubIssues({ owner: "owner", repo: "repo", state: "open", page: 1, per_page: 30 }) as Record<string, unknown>;
    expect(result.returned).toBe(1);
    const issues = result.issues as Record<string, unknown>[];
    expect(issues).toHaveLength(1);
    expect(issues[0].number).toBe(42);
    expect(issues[0].title).toBe("Fix the bug");
    expect(issues[0].state).toBe("open");
    expect(issues[0].labels).toEqual(["bug", "priority-high"]);
    expect(issues[0].assignees).toEqual(["alice"]);
    expect(issues[0].html_url).toBe("https://github.com/owner/repo/issues/42");
  });

  it("returns empty list when no issues", async () => {
    stubFetch([]);
    const result = await listGithubIssues({ owner: "owner", repo: "repo", state: "open", page: 1, per_page: 30 }) as Record<string, unknown>;
    expect(result.returned).toBe(0);
    expect(result.issues).toEqual([]);
  });

  it("returns error and status on GitHubError", async () => {
    stubFetch({ message: "Not Found" }, 404);
    const result = await listGithubIssues({ owner: "owner", repo: "nope", state: "open", page: 1, per_page: 30 }) as Record<string, unknown>;
    expect(result.error).toBeDefined();
    expect(result.status).toBe(404);
  });

  it("throws on network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network failure")));
    await expect(listGithubIssues({ owner: "owner", repo: "repo", state: "open", page: 1, per_page: 30 })).rejects.toThrow("network failure");
  });
});

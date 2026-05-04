import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchJiraIssuesUsingJql } from "../../tools/search-issues.js";

beforeEach(() => vi.restoreAllMocks());

function stubSearch(total: number, startAt: number, issues: unknown[]) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ total, startAt, maxResults: issues.length, issues }),
  }));
}

function makeIssue(key: string) {
  return {
    key,
    fields: {
      summary: key,
      status: { name: "Open" },
      assignee: null,
      priority: { name: "Medium" },
      issuetype: { name: "Task" },
    },
  };
}

describe("searchJiraIssuesUsingJql — pagination", () => {
  it("returns nextStartAt when more pages exist", async () => {
    stubSearch(50, 0, [makeIssue("T-1"), makeIssue("T-2")]);
    const result = await searchJiraIssuesUsingJql({ jql: "project = T", startAt: 0, maxResults: 2 }) as Record<string, unknown>;
    expect(result.nextStartAt).toBe(2);
  });

  it("returns null nextStartAt on last page", async () => {
    stubSearch(2, 0, [makeIssue("T-1"), makeIssue("T-2")]);
    const result = await searchJiraIssuesUsingJql({ jql: "project = T", startAt: 0, maxResults: 25 }) as Record<string, unknown>;
    expect(result.nextStartAt).toBeNull();
  });

  it("returns correct nextStartAt mid-pagination", async () => {
    stubSearch(100, 25, Array.from({ length: 25 }, (_, i) => makeIssue(`T-${i + 26}`)));
    const result = await searchJiraIssuesUsingJql({ jql: "project = T", startAt: 25, maxResults: 25 }) as Record<string, unknown>;
    expect(result.nextStartAt).toBe(50);
  });
});

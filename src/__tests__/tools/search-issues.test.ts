import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchJiraIssuesUsingJql } from "../../tools/search-issues.js";
import { JiraClient } from "../../jira/client.js";

const client = new JiraClient();

beforeEach(() => vi.restoreAllMocks());

function stubSearch(issues: unknown[], isLast = true, nextPageToken?: string) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ isLast, nextPageToken, issues }),
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
  it("returns nextPageToken when more pages exist", async () => {
    stubSearch([makeIssue("T-1"), makeIssue("T-2")], false, "cursor-abc");
    const result = await searchJiraIssuesUsingJql({ jql: "project = T", maxResults: 2 }, client) as Record<string, unknown>;
    expect(result.isLast).toBe(false);
    expect(result.nextPageToken).toBe("cursor-abc");
  });

  it("returns null nextPageToken on last page", async () => {
    stubSearch([makeIssue("T-1"), makeIssue("T-2")], true);
    const result = await searchJiraIssuesUsingJql({ jql: "project = T", maxResults: 25 }, client) as Record<string, unknown>;
    expect(result.isLast).toBe(true);
    expect(result.nextPageToken).toBeNull();
  });

  it("sends *navigable fields by default", async () => {
    stubSearch([makeIssue("T-1")]);
    await searchJiraIssuesUsingJql({ jql: "project = T", maxResults: 25 }, client);
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(body.fields).toEqual(["*navigable"]);
  });

  it("passes caller-specified fields instead of default", async () => {
    stubSearch([makeIssue("T-1")]);
    await searchJiraIssuesUsingJql({ jql: "project = T", maxResults: 25, fields: ["summary", "status"] }, client);
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(body.fields).toEqual(["summary", "status"]);
  });

  it("passes nextPageToken to request body for subsequent pages", async () => {
    stubSearch(Array.from({ length: 25 }, (_, i) => makeIssue(`T-${i + 26}`)), false, "cursor-xyz");
    await searchJiraIssuesUsingJql({ jql: "project = T", nextPageToken: "cursor-abc", maxResults: 25 }, client);
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(body.nextPageToken).toBe("cursor-abc");
    expect(body.startAt).toBeUndefined();
  });
});

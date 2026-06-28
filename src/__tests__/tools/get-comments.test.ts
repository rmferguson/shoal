import { describe, it, expect, vi, beforeEach } from "vitest";
import { getJiraIssueComments } from "../../tools/get-comments.js";
import { JiraClient } from "../../jira/client.js";

const client = new JiraClient();

beforeEach(() => vi.restoreAllMocks());

const makeComment = (i: number) => ({
  id: String(i),
  author: { displayName: "Bob", accountId: "bob" },
  created: "2026-01-01",
  updated: "2026-01-01",
  body: null,
});

const adfBody = (text: string) => ({
  type: "doc",
  version: 1,
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

describe("getJiraIssueComments", () => {
  it("maps comments from response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            total: 1,
            startAt: 0,
            maxResults: 25,
            comments: [
              {
                id: "100",
                author: { displayName: "Alice", accountId: "acc-1" },
                created: "2026-01-01",
                updated: "2026-01-02",
                body: adfBody("Hello"),
              },
            ],
          }),
      })
    );

    const result = (await getJiraIssueComments(
      { issueKey: "TEST-1", startAt: 0, maxResults: 25 },
      client
    )) as Record<string, unknown>;

    expect(result.total).toBe(1);
    expect(result.returned).toBe(1);
    const comments = result.comments as Array<Record<string, unknown>>;
    expect(comments[0].id).toBe("100");
    expect(comments[0].created).toBe("2026-01-01");
    expect(comments[0].updated).toBe("2026-01-02");
    expect((comments[0].author as Record<string, unknown>).displayName).toBe("Alice");
    expect((comments[0].author as Record<string, unknown>).accountId).toBe("acc-1");
  });

  it("renders ADF body to plain text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            total: 1,
            startAt: 0,
            maxResults: 25,
            comments: [
              {
                id: "1",
                author: { displayName: "Carol", accountId: "c" },
                created: "2026-01-01",
                updated: "2026-01-01",
                body: adfBody("rendered text"),
              },
            ],
          }),
      })
    );

    const result = (await getJiraIssueComments(
      { issueKey: "TEST-1", startAt: 0, maxResults: 25 },
      client
    )) as Record<string, unknown>;
    const comments = result.comments as Array<Record<string, unknown>>;
    expect(comments[0].body).toBe("rendered text");
  });

  it("includes nextStartAt when more results exist", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            total: 50,
            startAt: 0,
            maxResults: 25,
            comments: Array.from({ length: 25 }, (_, i) => makeComment(i)),
          }),
      })
    );

    const result = (await getJiraIssueComments(
      { issueKey: "TEST-1", startAt: 0, maxResults: 25 },
      client
    )) as Record<string, unknown>;
    expect(result.nextStartAt).toBe(25);
  });

  it("returns null nextStartAt on last page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            total: 3,
            startAt: 0,
            maxResults: 25,
            comments: Array.from({ length: 3 }, (_, i) => makeComment(i)),
          }),
      })
    );

    const result = (await getJiraIssueComments(
      { issueKey: "TEST-1", startAt: 0, maxResults: 25 },
      client
    )) as Record<string, unknown>;
    expect(result.nextStartAt).toBeNull();
  });

  it("clamps maxResults to 100", async () => {
    let capturedUrl = "";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        capturedUrl = url;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({ total: 0, startAt: 0, maxResults: 100, comments: [] }),
        });
      })
    );

    await getJiraIssueComments({ issueKey: "TEST-1", startAt: 0, maxResults: 200 }, client);
    expect(capturedUrl).toContain("maxResults=100");
  });

  it("includes orderBy=created in query", async () => {
    let capturedUrl = "";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        capturedUrl = url;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({ total: 0, startAt: 0, maxResults: 25, comments: [] }),
        });
      })
    );

    await getJiraIssueComments({ issueKey: "TEST-1", startAt: 0, maxResults: 25 }, client);
    expect(capturedUrl).toContain("orderBy=created");
  });
});

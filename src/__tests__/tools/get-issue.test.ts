import { describe, it, expect, vi, beforeEach } from "vitest";
import { getJiraIssue } from "../../tools/get-issue.js";

beforeEach(() => vi.restoreAllMocks());

function makeIssue(fields: Record<string, unknown> = {}) {
  return {
    key: "TEST-1",
    fields: {
      summary: "Test issue",
      status: { name: "In Progress" },
      assignee: { displayName: "Alice" },
      reporter: { displayName: "Bob" },
      priority: { name: "High" },
      issuetype: { name: "Story" },
      labels: ["alpha"],
      description: {
        type: "doc",
        version: 1,
        content: [{ type: "paragraph", content: [{ type: "text", text: "Hello world" }] }],
      },
      ...fields,
    },
  };
}

function stubFetch(body: unknown, status = 200) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  }));
}

describe("getJiraIssue", () => {
  it("renders ADF description to plain text by default", async () => {
    stubFetch(makeIssue());
    const result = await getJiraIssue({ issueKey: "TEST-1" }) as Record<string, unknown>;
    expect(result.description).toBe("Hello world");
  });

  it("returns raw ADF when rawAdf is true", async () => {
    stubFetch(makeIssue());
    const result = await getJiraIssue({ issueKey: "TEST-1", rawAdf: true }) as Record<string, unknown>;
    expect((result.description as Record<string, unknown>).type).toBe("doc");
  });

  it("surfaces custom fields without filtering", async () => {
    stubFetch(makeIssue({ customfield_10016: 5, customfield_99999: "foo" }));
    const result = await getJiraIssue({ issueKey: "TEST-1" }) as Record<string, unknown>;
    const custom = result.customFields as Record<string, unknown>;
    expect(custom.customfield_10016).toBe(5);
    expect(custom.customfield_99999).toBe("foo");
  });

  it("returns friendly error on AbortError", async () => {
    const err = new Error("aborted");
    err.name = "AbortError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(err));
    const result = await getJiraIssue({ issueKey: "TEST-1" }) as Record<string, unknown>;
    expect(result.error).toMatch(/timed out/);
    expect(result.error).toMatch(/rawAdf: true/);
  });

  it("returns error object on JiraError", async () => {
    stubFetch({ errorMessages: ["Not found"] }, 404);
    const result = await getJiraIssue({ issueKey: "NOPE-1" }) as Record<string, unknown>;
    expect(result.error).toBeDefined();
    expect(result.status).toBe(404);
  });
});

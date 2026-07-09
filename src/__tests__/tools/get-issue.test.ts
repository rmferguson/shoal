import { describe, it, expect, vi, beforeEach } from "vitest";
import { getJiraIssue } from "../../tools/get-issue.js";
import { JiraClient } from "../../jira/client.js";

const client = new JiraClient();

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
    const result = await getJiraIssue({ issueKey: "TEST-1" }, client) as Record<string, unknown>;
    expect(result.description).toBe("Hello world");
  });

  it("returns raw ADF when rawAdf is true", async () => {
    stubFetch(makeIssue());
    const result = await getJiraIssue({ issueKey: "TEST-1", rawAdf: true }, client) as Record<string, unknown>;
    expect((result.description as Record<string, unknown>).type).toBe("doc");
  });

  it("surfaces custom fields without filtering", async () => {
    stubFetch(makeIssue({ customfield_10016: 5, customfield_99999: "foo" }));
    const result = await getJiraIssue({ issueKey: "TEST-1" }, client) as Record<string, unknown>;
    const custom = result.customFields as Record<string, unknown>;
    expect(custom.customfield_10016).toBe(5);
    expect(custom.customfield_99999).toBe("foo");
  });

  it("returns friendly error on AbortError", async () => {
    const err = new Error("aborted");
    err.name = "AbortError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(err));
    const result = await getJiraIssue({ issueKey: "TEST-1" }, client) as Record<string, unknown>;
    expect(result.error).toMatch(/timed out/);
    expect(result.error).toMatch(/rawAdf: true/);
  });

  it("returns error object on JiraError", async () => {
    stubFetch({ errorMessages: ["Not found"] }, 404);
    const result = await getJiraIssue({ issueKey: "NOPE-1" }, client) as Record<string, unknown>;
    expect(result.error).toBeDefined();
    expect(result.status).toBe(404);
  });

  it("returns an empty issueLinks array when the issue has no links", async () => {
    stubFetch(makeIssue());
    const result = await getJiraIssue({ issueKey: "TEST-1" }, client) as Record<string, unknown>;
    expect(result.issueLinks).toEqual([]);
  });

  it("shapes an outward link using the type's outward label", async () => {
    stubFetch(makeIssue({
      issuelinks: [
        {
          type: { name: "Blocks", inward: "is blocked by", outward: "blocks" },
          outwardIssue: { key: "TEST-2", fields: { summary: "Downstream task" } },
        },
      ],
    }));
    const result = await getJiraIssue({ issueKey: "TEST-1" }, client) as Record<string, unknown>;
    expect(result.issueLinks).toEqual([
      { type: "Blocks", direction: "blocks", issueKey: "TEST-2", summary: "Downstream task" },
    ]);
  });

  it("shapes an inward link using the type's inward label", async () => {
    stubFetch(makeIssue({
      issuelinks: [
        {
          type: { name: "Blocks", inward: "is blocked by", outward: "blocks" },
          inwardIssue: { key: "TEST-3", fields: { summary: "Upstream task" } },
        },
      ],
    }));
    const result = await getJiraIssue({ issueKey: "TEST-1" }, client) as Record<string, unknown>;
    expect(result.issueLinks).toEqual([
      { type: "Blocks", direction: "is blocked by", issueKey: "TEST-3", summary: "Upstream task" },
    ]);
  });

  it("shapes multiple links, preserving order", async () => {
    stubFetch(makeIssue({
      issuelinks: [
        {
          type: { name: "Blocks", inward: "is blocked by", outward: "blocks" },
          outwardIssue: { key: "TEST-2", fields: { summary: "Downstream task" } },
        },
        {
          type: { name: "Relates", inward: "relates to", outward: "relates to" },
          inwardIssue: { key: "TEST-4", fields: { summary: "Related task" } },
        },
      ],
    }));
    const result = await getJiraIssue({ issueKey: "TEST-1" }, client) as Record<string, unknown>;
    expect(result.issueLinks).toEqual([
      { type: "Blocks", direction: "blocks", issueKey: "TEST-2", summary: "Downstream task" },
      { type: "Relates", direction: "relates to", issueKey: "TEST-4", summary: "Related task" },
    ]);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createJiraIssue } from "../../tools/create-issue.js";
import { captureBody } from "../helpers.js";
import { JiraClient } from "../../jira/client.js";

const client = new JiraClient();

beforeEach(() => vi.restoreAllMocks());

function stubCreate(response = { key: "TEST-1", id: "10001", self: "https://test.atlassian.net/rest/api/3/issue/10001" }) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    status: 201,
    json: () => Promise.resolve(response),
    text: () => Promise.resolve(JSON.stringify(response)),
  }));
}

function stubCreateError(body: unknown, status = 400) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  }));
}

describe("createJiraIssue", () => {
  it("serializes components as {name} objects, not plain strings", async () => {
    const bodyPromise = captureBody();
    await createJiraIssue({ projectKey: "TEST", summary: "A bug", issueType: "Task", components: ["Frontend", "API"] }, client);
    const body = await bodyPromise;
    const fields = body.fields as Record<string, unknown>;
    expect(fields.components).toEqual([{ name: "Frontend" }, { name: "API" }]);
  });

  it("wraps description in ADF", async () => {
    const bodyPromise = captureBody();
    await createJiraIssue({ projectKey: "TEST", summary: "A bug", issueType: "Task", description: "Some details" }, client);
    const body = await bodyPromise;
    const fields = body.fields as Record<string, unknown>;
    const desc = fields.description as Record<string, unknown>;
    expect(desc.type).toBe("doc");
    expect(desc.version).toBe(1);
  });

  it("makes exactly one POST (no retry)", async () => {
    stubCreate();
    await createJiraIssue({ projectKey: "TEST", summary: "Once only", issueType: "Task" }, client);
    expect((vi.mocked(globalThis.fetch) as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
  });

  it("upcases project key", async () => {
    const bodyPromise = captureBody();
    await createJiraIssue({ projectKey: "test", summary: "lowercase key", issueType: "Task" }, client);
    const body = await bodyPromise;
    const fields = body.fields as Record<string, unknown>;
    expect((fields.project as Record<string, string>).key).toBe("TEST");
  });
});

describe("createJiraIssue - issue-type hints (#2)", () => {
  it("adds a hint mentioning getJiraIssueTypes when Jira rejects with a 400 body mentioning issuetype", async () => {
    stubCreateError({ errors: { issuetype: "valid values are ..." } });

    const result = (await createJiraIssue(
      { projectKey: "TEST", summary: "A bug", issueType: "Sub-task" },
      client
    )) as Record<string, unknown>;

    expect(result.hint).toBeDefined();
    expect(result.hint as string).toContain("getJiraIssueTypes");
    expect(result.hint as string).toContain("TEST");
  });

  it("adds a hint mentioning customfield_10014 and getJiraIssueTypes when Jira rejects with a 400 body mentioning parent", async () => {
    stubCreateError({ errors: { parent: "field 'parent' cannot be set" } });

    const result = (await createJiraIssue(
      { projectKey: "TEST", summary: "A bug", issueType: "Task", parent: "EPIC-1" },
      client
    )) as Record<string, unknown>;

    expect(result.hint).toBeDefined();
    expect(result.hint as string).toContain("customfield_10014");
    expect(result.hint as string).toContain("getJiraIssueTypes");
  });

  it("does not add a hint for an unrelated 400, and passes error/status/body through unchanged", async () => {
    const errorBody = { errorMessages: ["Field 'summary' is required."] };
    stubCreateError(errorBody);

    const result = (await createJiraIssue(
      { projectKey: "TEST", summary: "A bug", issueType: "Task" },
      client
    )) as Record<string, unknown>;

    expect(result.hint).toBeUndefined();
    expect(result.status).toBe(400);
    expect(result.body).toBe(JSON.stringify(errorBody));
    expect(result.error).toBeDefined();
  });

  it("does not add a hint on a timeout (AbortError)", async () => {
    const err = new Error("aborted");
    err.name = "AbortError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(err));

    const result = (await createJiraIssue(
      { projectKey: "TEST", summary: "A bug", issueType: "Task" },
      client
    )) as Record<string, unknown>;

    expect(result.hint).toBeUndefined();
    expect(result.error).toBe("Request timed out creating issue.");
  });

  it("makes exactly one POST even on the enriched-error (hint) path", async () => {
    stubCreateError({ errors: { issuetype: "valid values are ..." } });

    await createJiraIssue({ projectKey: "TEST", summary: "A bug", issueType: "Sub-task" }, client);

    expect((vi.mocked(globalThis.fetch) as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
  });
});

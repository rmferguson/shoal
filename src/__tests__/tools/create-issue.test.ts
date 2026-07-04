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

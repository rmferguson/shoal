import { describe, it, expect, vi, beforeEach } from "vitest";
import { createJiraIssue } from "../../tools/create-issue.js";

beforeEach(() => vi.restoreAllMocks());

function stubCreate(response = { key: "TEST-1", id: "10001", self: "https://test.atlassian.net/rest/api/3/issue/10001" }) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    status: 201,
    json: () => Promise.resolve(response),
  }));
}

function captureBody(): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      resolve(JSON.parse(init.body as string));
      return Promise.resolve({ ok: true, status: 201, json: () => Promise.resolve({ key: "T-1", id: "1", self: "url" }) });
    }));
  });
}

describe("createJiraIssue", () => {
  it("serializes components as {name} objects, not plain strings", async () => {
    const bodyPromise = captureBody();
    await createJiraIssue({ projectKey: "TEST", summary: "A bug", issueType: "Task", components: ["Frontend", "API"] });
    const body = await bodyPromise;
    const fields = body.fields as Record<string, unknown>;
    expect(fields.components).toEqual([{ name: "Frontend" }, { name: "API" }]);
  });

  it("wraps description in ADF", async () => {
    const bodyPromise = captureBody();
    await createJiraIssue({ projectKey: "TEST", summary: "A bug", issueType: "Task", description: "Some details" });
    const body = await bodyPromise;
    const fields = body.fields as Record<string, unknown>;
    const desc = fields.description as Record<string, unknown>;
    expect(desc.type).toBe("doc");
    expect(desc.version).toBe(1);
  });

  it("makes exactly one POST (no retry)", async () => {
    stubCreate();
    await createJiraIssue({ projectKey: "TEST", summary: "Once only", issueType: "Task" });
    expect((vi.mocked(globalThis.fetch) as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
  });

  it("upcases project key", async () => {
    const bodyPromise = captureBody();
    await createJiraIssue({ projectKey: "test", summary: "lowercase key", issueType: "Task" });
    const body = await bodyPromise;
    const fields = body.fields as Record<string, unknown>;
    expect((fields.project as Record<string, string>).key).toBe("TEST");
  });
});

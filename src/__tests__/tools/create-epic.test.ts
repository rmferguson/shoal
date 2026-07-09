import { describe, it, expect, vi, beforeEach } from "vitest";
import { createJiraEpic } from "../../tools/create-epic.js";
import { captureBody } from "../helpers.js";
import { JiraClient } from "../../jira/client.js";

const client = new JiraClient();

beforeEach(() => vi.restoreAllMocks());

function stubCreate(response = { key: "EPIC-1", id: "10001", self: "https://test.atlassian.net/rest/api/3/issue/10001" }) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    status: 201,
    json: () => Promise.resolve(response),
    text: () => Promise.resolve(JSON.stringify(response)),
  }));
}

describe("createJiraEpic", () => {
  it("hardcodes issuetype to Epic", async () => {
    const bodyPromise = captureBody();
    await createJiraEpic({ projectKey: "TEST", summary: "A big epic" }, client);
    const body = await bodyPromise;
    const fields = body.fields as Record<string, unknown>;
    expect(fields.issuetype).toEqual({ name: "Epic" });
  });

  it("sets customfield_10011 when epicName is provided", async () => {
    const bodyPromise = captureBody();
    await createJiraEpic({ projectKey: "TEST", summary: "A big epic", epicName: "Big Epic" }, client);
    const body = await bodyPromise;
    const fields = body.fields as Record<string, unknown>;
    expect(fields.customfield_10011).toBe("Big Epic");
  });

  it("omits customfield_10011 when epicName is not provided", async () => {
    const bodyPromise = captureBody();
    await createJiraEpic({ projectKey: "TEST", summary: "A big epic" }, client);
    const body = await bodyPromise;
    const fields = body.fields as Record<string, unknown>;
    expect(fields.customfield_10011).toBeUndefined();
  });

  it("wraps description in ADF", async () => {
    const bodyPromise = captureBody();
    await createJiraEpic({ projectKey: "TEST", summary: "A big epic", description: "Some details" }, client);
    const body = await bodyPromise;
    const fields = body.fields as Record<string, unknown>;
    const desc = fields.description as Record<string, unknown>;
    expect(desc.type).toBe("doc");
    expect(desc.version).toBe(1);
    const content = desc.content as Array<{ content: Array<{ type: string; text: string }> }>;
    const textNode = content[0].content.find((n) => n.type === "text");
    expect(textNode?.text).toBe("Some details");
  });

  it("omits description when not provided", async () => {
    const bodyPromise = captureBody();
    await createJiraEpic({ projectKey: "TEST", summary: "A big epic" }, client);
    const body = await bodyPromise;
    const fields = body.fields as Record<string, unknown>;
    expect(fields.description).toBeUndefined();
  });

  it("serializes components as {name} objects, not plain strings", async () => {
    const bodyPromise = captureBody();
    await createJiraEpic(
      { projectKey: "TEST", summary: "A big epic", components: ["Frontend", "API"] },
      client
    );
    const body = await bodyPromise;
    const fields = body.fields as Record<string, unknown>;
    expect(fields.components).toEqual([{ name: "Frontend" }, { name: "API" }]);
  });

  it("omits components when not provided", async () => {
    const bodyPromise = captureBody();
    await createJiraEpic({ projectKey: "TEST", summary: "A big epic" }, client);
    const body = await bodyPromise;
    const fields = body.fields as Record<string, unknown>;
    expect(fields.components).toBeUndefined();
  });

  it("merges customFields into the request body", async () => {
    const bodyPromise = captureBody();
    await createJiraEpic(
      {
        projectKey: "TEST",
        summary: "A big epic",
        customFields: { customfield_10099: "custom value", customfield_20000: 42 },
      },
      client
    );
    const body = await bodyPromise;
    const fields = body.fields as Record<string, unknown>;
    expect(fields.customfield_10099).toBe("custom value");
    expect(fields.customfield_20000).toBe(42);
  });

  it("makes exactly one POST (no retry)", async () => {
    stubCreate();
    await createJiraEpic({ projectKey: "TEST", summary: "Once only" }, client);
    expect((vi.mocked(globalThis.fetch) as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
  });

  it("returns key, id, and url on success", async () => {
    stubCreate({ key: "EPIC-42", id: "99887", self: "https://test.atlassian.net/rest/api/3/issue/99887" });
    const result = (await createJiraEpic(
      { projectKey: "TEST", summary: "A big epic" },
      client
    )) as Record<string, unknown>;
    expect(result.key).toBe("EPIC-42");
    expect(result.id).toBe("99887");
    expect(result.url).toBe("https://test.atlassian.net/rest/api/3/issue/99887");
  });

  it("upcases and trims the project key", async () => {
    const bodyPromise = captureBody();
    await createJiraEpic({ projectKey: "  test  ", summary: "A big epic" }, client);
    const body = await bodyPromise;
    const fields = body.fields as Record<string, unknown>;
    expect((fields.project as Record<string, string>).key).toBe("TEST");
  });
});

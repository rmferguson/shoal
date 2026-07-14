import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateJiraIssue } from "../../tools/update-issue.js";
import { captureBody } from "../helpers.js";
import { JiraClient } from "../../jira/client.js";

const client = new JiraClient();

beforeEach(() => vi.restoreAllMocks());

function stubUpdateError(body: unknown, status = 400) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  }));
}

describe("updateJiraIssue", () => {
  it("sends only the defined fields", async () => {
    const bodyPromise = captureBody();
    await updateJiraIssue({ issueKey: "TEST-1", summary: "New summary" }, client);
    const body = await bodyPromise;
    const fields = body.fields as Record<string, unknown>;
    expect(fields.summary).toBe("New summary");
    expect(fields.description).toBeUndefined();
    expect(fields.priority).toBeUndefined();
    expect(fields.assignee).toBeUndefined();
    expect(fields.labels).toBeUndefined();
    expect(fields.components).toBeUndefined();
  });

  it("wraps description in ADF", async () => {
    const bodyPromise = captureBody();
    await updateJiraIssue({ issueKey: "TEST-1", description: "My description" }, client);
    const body = await bodyPromise;
    const fields = body.fields as Record<string, unknown>;
    const desc = fields.description as Record<string, unknown>;
    expect(desc.type).toBe("doc");
    expect(desc.version).toBe(1);
    const content = desc.content as Array<{ content: Array<{ type: string; text: string }> }>;
    const textNode = content[0].content.find((n) => n.type === "text");
    expect(textNode?.text).toBe("My description");
  });

  it("serializes components as [{ name }] objects, not plain strings", async () => {
    const bodyPromise = captureBody();
    await updateJiraIssue(
      { issueKey: "TEST-1", components: ["backend", "frontend"] },
      client
    );
    const body = await bodyPromise;
    const fields = body.fields as Record<string, unknown>;
    expect(fields.components).toEqual([{ name: "backend" }, { name: "frontend" }]);
  });

  it("sets assignee to null when empty string is passed (unassign)", async () => {
    const bodyPromise = captureBody();
    await updateJiraIssue({ issueKey: "TEST-1", assigneeAccountId: "" }, client);
    const body = await bodyPromise;
    const fields = body.fields as Record<string, unknown>;
    expect(fields.assignee).toBeNull();
  });

  it("sets assignee to accountId object when accountId is provided", async () => {
    const bodyPromise = captureBody();
    await updateJiraIssue({ issueKey: "TEST-1", assigneeAccountId: "user-abc" }, client);
    const body = await bodyPromise;
    const fields = body.fields as Record<string, unknown>;
    expect(fields.assignee).toEqual({ accountId: "user-abc" });
  });

  it("sets priority as { name } object", async () => {
    const bodyPromise = captureBody();
    await updateJiraIssue({ issueKey: "TEST-1", priority: "High" }, client);
    const body = await bodyPromise;
    const fields = body.fields as Record<string, unknown>;
    expect(fields.priority).toEqual({ name: "High" });
  });

  it("merges customFields into fields", async () => {
    const bodyPromise = captureBody();
    await updateJiraIssue(
      { issueKey: "TEST-1", customFields: { customfield_10016: 8 } },
      client
    );
    const body = await bodyPromise;
    const fields = body.fields as Record<string, unknown>;
    expect(fields.customfield_10016).toBe(8);
  });

  it("uppercases and trims parent key", async () => {
    const bodyPromise = captureBody();
    await updateJiraIssue({ issueKey: "TEST-1", parent: "  proj-10  " }, client);
    const body = await bodyPromise;
    const fields = body.fields as Record<string, unknown>;
    expect(fields.parent).toEqual({ key: "PROJ-10" });
  });

  it("returns success and trimmed issueKey", async () => {
    const bodyPromise = captureBody();
    const result = (await updateJiraIssue(
      { issueKey: "  TEST-1  ", summary: "Updated" },
      client
    )) as Record<string, unknown>;
    await bodyPromise;
    expect(result.success).toBe(true);
    expect(result.issueKey).toBe("TEST-1");
  });

  it("passes labels array directly without transformation", async () => {
    const bodyPromise = captureBody();
    await updateJiraIssue({ issueKey: "TEST-1", labels: ["bug", "critical"] }, client);
    const body = await bodyPromise;
    const fields = body.fields as Record<string, unknown>;
    expect(fields.labels).toEqual(["bug", "critical"]);
  });
});

describe("updateJiraIssue - issue-type hints (#2)", () => {
  it("adds a hint mentioning customfield_10014 and getJiraIssueTypes on a parent-rejection 400, with projectKey derived from the issue key prefix", async () => {
    stubUpdateError({ errors: { parent: "field 'parent' cannot be set" } });

    const result = (await updateJiraIssue(
      { issueKey: "PROJ-123", parent: "EPIC-1" },
      client
    )) as Record<string, unknown>;

    expect(result.hint).toBeDefined();
    expect(result.hint as string).toContain("customfield_10014");
    expect(result.hint as string).toContain("getJiraIssueTypes");
    expect(result.hint as string).toContain("PROJ");
    expect(result.hint as string).not.toContain("PROJ-123");
  });

  it("does not add a hint on an unrelated 400", async () => {
    const errorBody = { errorMessages: ["Field 'summary' is required."] };
    stubUpdateError(errorBody);

    const result = (await updateJiraIssue(
      { issueKey: "TEST-1", summary: "New summary" },
      client
    )) as Record<string, unknown>;

    expect(result.hint).toBeUndefined();
    expect(result.status).toBe(400);
  });

  it("does not add a hint on a timeout (AbortError)", async () => {
    const err = new Error("aborted");
    err.name = "AbortError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(err));

    const result = (await updateJiraIssue(
      { issueKey: "TEST-1", parent: "EPIC-1" },
      client
    )) as Record<string, unknown>;

    expect(result.hint).toBeUndefined();
    expect(result.error).toMatch(/timed out/);
  });
});

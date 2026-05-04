import { describe, it, expect, vi, beforeEach } from "vitest";
import { manageJiraIssueLabels, ManageLabelsInput } from "../../tools/manage-labels.js";

beforeEach(() => vi.restoreAllMocks());

function captureBody(): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      resolve(JSON.parse(init.body as string));
      return Promise.resolve({ ok: true, status: 204 });
    }));
  });
}

describe("ManageLabelsInput validation", () => {
  it("rejects when neither add nor remove is provided", () => {
    expect(() => ManageLabelsInput.parse({ issueKey: "T-1" })).toThrow();
  });

  it("rejects when both arrays are empty", () => {
    expect(() => ManageLabelsInput.parse({ issueKey: "T-1", add: [], remove: [] })).toThrow();
  });

  it("accepts when only add is provided", () => {
    expect(() => ManageLabelsInput.parse({ issueKey: "T-1", add: ["bug"] })).not.toThrow();
  });

  it("accepts when only remove is provided", () => {
    expect(() => ManageLabelsInput.parse({ issueKey: "T-1", remove: ["wontfix"] })).not.toThrow();
  });
});

describe("manageJiraIssueLabels", () => {
  it("uses Jira update syntax, not fields syntax", async () => {
    const bodyPromise = captureBody();
    await manageJiraIssueLabels({ issueKey: "T-1", add: ["bug"], remove: ["wontfix"] });
    const body = await bodyPromise;
    expect(body.update).toBeDefined();
    expect(body.fields).toBeUndefined();
  });

  it("builds separate add/remove ops", async () => {
    const bodyPromise = captureBody();
    await manageJiraIssueLabels({ issueKey: "T-1", add: ["alpha", "beta"], remove: ["gamma"] });
    const body = await bodyPromise;
    const ops = (body.update as Record<string, unknown>).labels as unknown[];
    expect(ops).toContainEqual({ add: "alpha" });
    expect(ops).toContainEqual({ add: "beta" });
    expect(ops).toContainEqual({ remove: "gamma" });
  });
});

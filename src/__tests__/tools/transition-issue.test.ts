import { describe, it, expect, vi, beforeEach } from "vitest";
import { transitionJiraIssue } from "../../tools/transition-issue.js";

beforeEach(() => vi.restoreAllMocks());

function captureBody(): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      resolve(JSON.parse(init.body as string));
      return Promise.resolve({ ok: true, status: 204 });
    }));
  });
}

describe("transitionJiraIssue", () => {
  it("sends transition id in body", async () => {
    const bodyPromise = captureBody();
    await transitionJiraIssue({ issueKey: "T-1", transitionId: "31", clearResolution: false });
    const body = await bodyPromise;
    expect((body.transition as Record<string, unknown>).id).toBe("31");
  });

  it("omits update.resolution when clearResolution is false", async () => {
    const bodyPromise = captureBody();
    await transitionJiraIssue({ issueKey: "T-1", transitionId: "31", clearResolution: false });
    const body = await bodyPromise;
    expect(body.update).toBeUndefined();
  });

  it("adds update.resolution=[{set:null}] when clearResolution is true", async () => {
    const bodyPromise = captureBody();
    await transitionJiraIssue({ issueKey: "T-1", transitionId: "11", clearResolution: true });
    const body = await bodyPromise;
    const update = body.update as Record<string, unknown>;
    expect(update.resolution).toEqual([{ set: null }]);
  });
});

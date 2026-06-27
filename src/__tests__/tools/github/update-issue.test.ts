import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateGithubIssue } from "../../../tools/github/update-issue.js";

beforeEach(() => vi.restoreAllMocks());

function stubFetch(body: unknown, status = 200) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  }));
}

function captureRequestBody(): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      resolve(JSON.parse(init.body as string));
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ number: 5, title: "Updated title", state: "closed", html_url: "https://github.com/owner/repo/issues/5" }),
        text: () => Promise.resolve(""),
      });
    }));
  });
}

describe("updateGithubIssue", () => {
  it("returns number, title, state, and html_url on success", async () => {
    stubFetch({ number: 5, title: "Updated title", state: "closed", html_url: "https://github.com/owner/repo/issues/5" });
    const result = await updateGithubIssue({ owner: "owner", repo: "repo", issue_number: 5, title: "Updated title", state: "closed" }) as Record<string, unknown>;
    expect(result.number).toBe(5);
    expect(result.title).toBe("Updated title");
    expect(result.state).toBe("closed");
    expect(result.html_url).toBe("https://github.com/owner/repo/issues/5");
  });

  it("only sends provided fields in payload", async () => {
    const bodyPromise = captureRequestBody();
    await updateGithubIssue({ owner: "owner", repo: "repo", issue_number: 5, title: "New title" });
    const sent = await bodyPromise;
    expect(sent.title).toBe("New title");
    expect(sent).not.toHaveProperty("body");
    expect(sent).not.toHaveProperty("state");
    expect(sent).not.toHaveProperty("labels");
    expect(sent).not.toHaveProperty("assignees");
    expect(sent).not.toHaveProperty("milestone");
  });

  it("sends full payload when all fields provided", async () => {
    const bodyPromise = captureRequestBody();
    await updateGithubIssue({
      owner: "owner",
      repo: "repo",
      issue_number: 5,
      title: "Full update",
      body: "Updated body",
      state: "closed",
      labels: ["done"],
      assignees: ["dave"],
      milestone: null,
    });
    const sent = await bodyPromise;
    expect(sent.title).toBe("Full update");
    expect(sent.body).toBe("Updated body");
    expect(sent.state).toBe("closed");
    expect(sent.labels).toEqual(["done"]);
    expect(sent.assignees).toEqual(["dave"]);
    expect(sent.milestone).toBeNull();
  });

  it("returns error, status, and body on GitHubError", async () => {
    stubFetch({ message: "Not Found" }, 404);
    const result = await updateGithubIssue({ owner: "owner", repo: "repo", issue_number: 9999, state: "closed" }) as Record<string, unknown>;
    expect(result.error).toBeDefined();
    expect(result.status).toBe(404);
    expect(result).toHaveProperty("body");
  });

  it("throws on network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("socket hang up")));
    await expect(updateGithubIssue({ owner: "owner", repo: "repo", issue_number: 5, title: "Fail" })).rejects.toThrow("socket hang up");
  });
});

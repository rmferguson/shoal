import { describe, it, expect, vi, beforeEach } from "vitest";
import { createGithubIssue } from "../../../tools/github/create-issue.js";

beforeEach(() => vi.restoreAllMocks());

function stubFetch(body: unknown, status = 201) {
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
        status: 201,
        json: () => Promise.resolve({ number: 10, title: "New issue", html_url: "https://github.com/owner/repo/issues/10" }),
        text: () => Promise.resolve(""),
      });
    }));
  });
}

describe("createGithubIssue", () => {
  it("returns number, title, and html_url on success", async () => {
    stubFetch({ number: 10, title: "New issue", html_url: "https://github.com/owner/repo/issues/10" });
    const result = await createGithubIssue({ owner: "owner", repo: "repo", title: "New issue" }) as Record<string, unknown>;
    expect(result.number).toBe(10);
    expect(result.title).toBe("New issue");
    expect(result.html_url).toBe("https://github.com/owner/repo/issues/10");
  });

  it("sends title in request payload", async () => {
    const bodyPromise = captureRequestBody();
    await createGithubIssue({ owner: "owner", repo: "repo", title: "My new issue" });
    const sent = await bodyPromise;
    expect(sent.title).toBe("My new issue");
  });

  it("includes optional fields when provided", async () => {
    const bodyPromise = captureRequestBody();
    await createGithubIssue({
      owner: "owner",
      repo: "repo",
      title: "With extras",
      body: "Some description",
      labels: ["bug", "help wanted"],
      assignees: ["alice"],
      milestone: 2,
    });
    const sent = await bodyPromise;
    expect(sent.body).toBe("Some description");
    expect(sent.labels).toEqual(["bug", "help wanted"]);
    expect(sent.assignees).toEqual(["alice"]);
    expect(sent.milestone).toBe(2);
  });

  it("omits optional fields when not provided", async () => {
    const bodyPromise = captureRequestBody();
    await createGithubIssue({ owner: "owner", repo: "repo", title: "Minimal" });
    const sent = await bodyPromise;
    expect(sent).not.toHaveProperty("body");
    expect(sent).not.toHaveProperty("labels");
    expect(sent).not.toHaveProperty("assignees");
    expect(sent).not.toHaveProperty("milestone");
  });

  it("returns error, status, and body on GitHubError", async () => {
    stubFetch({ message: "Validation Failed" }, 422);
    const result = await createGithubIssue({ owner: "owner", repo: "repo", title: "Bad" }) as Record<string, unknown>;
    expect(result.error).toBeDefined();
    expect(result.status).toBe(422);
    expect(result).toHaveProperty("body");
  });

  it("throws on network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    await expect(createGithubIssue({ owner: "owner", repo: "repo", title: "Fail" })).rejects.toThrow("timeout");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GitHubClient } from "../../../github/client.js";
import { addCommentToGithubIssue } from "../../../tools/github/add-comment.js";
import { captureRequestBody } from "../../helpers.js";

beforeEach(() => vi.restoreAllMocks());

const client = new GitHubClient({ token: "test-token", requestTimeoutMs: 5000 });

function stubFetch(body: unknown, status = 201) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  }));
}

describe("addCommentToGithubIssue", () => {
  it("returns id, body, created_at, and user on success", async () => {
    stubFetch({ id: 99, body: "Great idea!", created_at: "2026-03-01T00:00:00Z", user: { login: "eve" } });
    const result = await addCommentToGithubIssue(client, { owner: "owner", repo: "repo", issueNumber: 7, body: "Great idea!" }) as Record<string, unknown>;
    expect(result.id).toBe(99);
    expect(result.body).toBe("Great idea!");
    expect(result.created_at).toBe("2026-03-01T00:00:00Z");
    expect(result.user).toBe("eve");
  });

  it("sends comment body in request payload", async () => {
    const bodyPromise = captureRequestBody();
    await addCommentToGithubIssue(client, { owner: "owner", repo: "repo", issueNumber: 7, body: "My comment" });
    const sent = await bodyPromise;
    expect(sent.body).toBe("My comment");
  });

  it("returns error, status, and body on GitHubError", async () => {
    stubFetch({ message: "Not Found" }, 404);
    const result = await addCommentToGithubIssue(client, { owner: "owner", repo: "repo", issueNumber: 9999, body: "Comment" }) as Record<string, unknown>;
    expect(result.error).toBeDefined();
    expect(result.status).toBe(404);
    expect(result).toHaveProperty("body");
  });

  it("throws on network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNRESET")));
    await expect(addCommentToGithubIssue(client, { owner: "owner", repo: "repo", issueNumber: 7, body: "Fail" })).rejects.toThrow("ECONNRESET");
  });
});

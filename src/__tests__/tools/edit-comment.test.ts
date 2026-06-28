import { describe, it, expect, vi, beforeEach } from "vitest";
import { editJiraIssueComment } from "../../tools/edit-comment.js";
import { captureBody } from "../helpers.js";
import { JiraClient } from "../../jira/client.js";

const client = new JiraClient();

beforeEach(() => vi.restoreAllMocks());

describe("editJiraIssueComment", () => {
  it("wraps body in ADF doc structure", async () => {
    const bodyPromise = captureBody();
    await editJiraIssueComment(
      { issueKey: "TEST-1", commentId: "100", body: "Updated text" },
      client
    );
    const sent = await bodyPromise;
    const adf = sent.body as Record<string, unknown>;
    expect(adf.type).toBe("doc");
    expect(adf.version).toBe(1);
  });

  it("includes the comment text in ADF content", async () => {
    const bodyPromise = captureBody();
    await editJiraIssueComment(
      { issueKey: "TEST-1", commentId: "100", body: "My comment" },
      client
    );
    const sent = await bodyPromise;
    const adf = sent.body as {
      content: Array<{ content: Array<{ type: string; text: string }> }>;
    };
    const textNode = adf.content[0].content.find((n) => n.type === "text");
    expect(textNode?.text).toBe("My comment");
  });

  it("returns id, updated, and author from response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            id: "100",
            updated: "2026-06-27",
            author: { displayName: "Alice", accountId: "acc-1" },
          }),
      })
    );

    const result = (await editJiraIssueComment(
      { issueKey: "TEST-1", commentId: "100", body: "Hi" },
      client
    )) as Record<string, unknown>;

    expect(result.id).toBe("100");
    expect(result.updated).toBe("2026-06-27");
    expect((result.author as Record<string, unknown>).displayName).toBe("Alice");
    expect((result.author as Record<string, unknown>).accountId).toBe("acc-1");
  });

  it("sends to the correct endpoint including commentId", async () => {
    let capturedUrl = "";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        capturedUrl = url;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              id: "999",
              updated: "2026-06-27",
              author: { displayName: "Bob", accountId: "b" },
            }),
        });
      })
    );

    await editJiraIssueComment(
      { issueKey: "PROJ-5", commentId: "999", body: "Updated" },
      client
    );
    expect(capturedUrl).toContain("/PROJ-5/comment/999");
  });
});

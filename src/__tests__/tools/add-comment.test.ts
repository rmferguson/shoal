import { describe, it, expect, vi, beforeEach } from "vitest";
import { addCommentToJiraIssue } from "../../tools/add-comment.js";
import { captureBody } from "../helpers.js";

beforeEach(() => vi.restoreAllMocks());

describe("addCommentToJiraIssue", () => {
  it("wraps body in ADF doc structure", async () => {
    const bodyPromise = captureBody();
    await addCommentToJiraIssue({ issueKey: "TEST-1", body: "Hello" });
    const sent = await bodyPromise;
    const adf = sent.body as Record<string, unknown>;
    expect(adf.type).toBe("doc");
    expect(adf.version).toBe(1);
  });

  it("includes mention nodes with required accessLevel", async () => {
    const bodyPromise = captureBody();
    await addCommentToJiraIssue({
      issueKey: "TEST-1",
      body: "FYI",
      mentions: [{ accountId: "user-123", displayName: "Alice" }],
    });
    const sent = await bodyPromise;
    const adf = sent.body as { content: Array<{ content: Array<{ type: string; attrs: Record<string, unknown> }> }> };
    const paragraph = adf.content[0].content;
    const mention = paragraph.find((n) => n.type === "mention");
    expect(mention).toBeDefined();
    expect(mention!.attrs.accessLevel).toBe("APPLICATION");
    expect(mention!.attrs.id).toBe("user-123");
  });
});

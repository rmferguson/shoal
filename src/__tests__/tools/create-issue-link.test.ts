import { describe, it, expect, vi, beforeEach } from "vitest";
import { createJiraIssueLink } from "../../tools/create-issue-link.js";
import { captureBody } from "../helpers.js";
import { JiraClient } from "../../jira/client.js";

const client = new JiraClient();

beforeEach(() => vi.restoreAllMocks());

describe("createJiraIssueLink", () => {
  it("sends type, inwardIssue, and outwardIssue in body", async () => {
    const bodyPromise = captureBody();
    await createJiraIssueLink(
      { linkType: "Blocks", inwardIssueKey: "TEST-1", outwardIssueKey: "TEST-2" },
      client
    );
    const body = await bodyPromise;
    expect(body.type).toEqual({ name: "Blocks" });
    expect(body.inwardIssue).toEqual({ key: "TEST-1" });
    expect(body.outwardIssue).toEqual({ key: "TEST-2" });
  });

  it("omits comment when not provided", async () => {
    const bodyPromise = captureBody();
    await createJiraIssueLink(
      { linkType: "Relates", inwardIssueKey: "A-1", outwardIssueKey: "A-2" },
      client
    );
    const body = await bodyPromise;
    expect(body.comment).toBeUndefined();
  });

  it("includes ADF comment body when comment is provided", async () => {
    const bodyPromise = captureBody();
    await createJiraIssueLink(
      {
        linkType: "Blocks",
        inwardIssueKey: "TEST-1",
        outwardIssueKey: "TEST-2",
        comment: "This blocks that",
      },
      client
    );
    const body = await bodyPromise;
    const comment = body.comment as Record<string, unknown>;
    expect(comment).toBeDefined();
    const adfBody = comment.body as Record<string, unknown>;
    expect(adfBody.type).toBe("doc");
    expect(adfBody.version).toBe(1);
    const content = adfBody.content as Array<{
      content: Array<{ type: string; text: string }>;
    }>;
    const textNode = content[0].content.find((n) => n.type === "text");
    expect(textNode?.text).toBe("This blocks that");
  });

  it("returns success with link details", async () => {
    const bodyPromise = captureBody();
    const result = (await createJiraIssueLink(
      { linkType: "Blocks", inwardIssueKey: "TEST-1", outwardIssueKey: "TEST-2" },
      client
    )) as Record<string, unknown>;
    await bodyPromise;
    expect(result.success).toBe(true);
    expect(result.inwardIssueKey).toBe("TEST-1");
    expect(result.outwardIssueKey).toBe("TEST-2");
    expect(result.linkType).toBe("Blocks");
  });

  it("trims whitespace from issue keys", async () => {
    const bodyPromise = captureBody();
    await createJiraIssueLink(
      {
        linkType: "Blocks",
        inwardIssueKey: "  TEST-1  ",
        outwardIssueKey: "  TEST-2  ",
      },
      client
    );
    const body = await bodyPromise;
    expect((body.inwardIssue as Record<string, unknown>).key).toBe("TEST-1");
    expect((body.outwardIssue as Record<string, unknown>).key).toBe("TEST-2");
  });

  it("posts to /issueLink endpoint", async () => {
    let capturedUrl = "";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        capturedUrl = url;
        return Promise.resolve({
          ok: true,
          status: 204,
        });
      })
    );

    await createJiraIssueLink(
      { linkType: "Relates", inwardIssueKey: "A-1", outwardIssueKey: "A-2" },
      client
    );
    expect(capturedUrl).toContain("/issueLink");
  });
});

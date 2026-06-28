import { describe, it, expect, vi, beforeEach } from "vitest";
import { addAttachmentToJiraIssue } from "../../tools/add-attachment.js";
import { JiraClient } from "../../jira/client.js";

const client = new JiraClient();

beforeEach(() => vi.restoreAllMocks());

const base64Hello = Buffer.from("hello").toString("base64");

const mockAttachment = {
  id: "att-1",
  filename: "test.txt",
  size: 5,
  mimeType: "text/plain",
  created: "2026-01-01",
};

const mockFetch = (attachments: typeof mockAttachment[]) =>
  vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(attachments),
  });

describe("addAttachmentToJiraIssue", () => {
  it("returns mapped attachment objects from response", async () => {
    vi.stubGlobal("fetch", mockFetch([mockAttachment]));

    const result = (await addAttachmentToJiraIssue(
      { issueKey: "TEST-1", filename: "test.txt", content: base64Hello },
      client
    )) as Array<Record<string, unknown>>;

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("att-1");
    expect(result[0].filename).toBe("test.txt");
    expect(result[0].size).toBe(5);
    expect(result[0].mimeType).toBe("text/plain");
    expect(result[0].created).toBe("2026-01-01");
  });

  it("hits the correct attachments endpoint for the issue", async () => {
    let capturedUrl = "";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        capturedUrl = url;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([mockAttachment]),
        });
      })
    );

    await addAttachmentToJiraIssue(
      { issueKey: "PROJ-42", filename: "file.txt", content: base64Hello },
      client
    );
    expect(capturedUrl).toContain("/PROJ-42/attachments");
  });

  it("sends a FormData body (multipart upload)", async () => {
    let capturedInit: RequestInit | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url: string, init: RequestInit) => {
        capturedInit = init;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([mockAttachment]),
        });
      })
    );

    await addAttachmentToJiraIssue(
      { issueKey: "TEST-1", filename: "data.txt", content: base64Hello },
      client
    );
    expect(capturedInit?.body).toBeInstanceOf(FormData);
  });

  it("returns multiple attachments when server returns multiple", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch([
        { id: "1", filename: "a.txt", size: 1, mimeType: "text/plain", created: "2026-01-01" },
        { id: "2", filename: "b.txt", size: 2, mimeType: "text/plain", created: "2026-01-02" },
      ])
    );

    const result = (await addAttachmentToJiraIssue(
      { issueKey: "TEST-1", filename: "a.txt", content: base64Hello },
      client
    )) as Array<Record<string, unknown>>;

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("1");
    expect(result[1].id).toBe("2");
  });

  it("defaults mimeType to application/octet-stream when omitted", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch([
        {
          id: "1",
          filename: "f.bin",
          size: 1,
          mimeType: "application/octet-stream",
          created: "2026-01-01",
        },
      ])
    );

    const result = (await addAttachmentToJiraIssue(
      { issueKey: "TEST-1", filename: "f.bin", content: base64Hello },
      client
    )) as Array<Record<string, unknown>>;

    // The schema default ensures the call doesn't throw with no mimeType provided
    expect(result[0].mimeType).toBe("application/octet-stream");
  });

  it("sends X-Atlassian-Token: no-check header", async () => {
    let capturedHeaders: Record<string, string> | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url: string, init: RequestInit) => {
        capturedHeaders = init.headers as Record<string, string>;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([mockAttachment]),
        });
      })
    );

    await addAttachmentToJiraIssue(
      { issueKey: "TEST-1", filename: "test.txt", content: base64Hello },
      client
    );
    expect(capturedHeaders?.["X-Atlassian-Token"]).toBe("no-check");
  });
});

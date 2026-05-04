import { describe, it, expect, vi, beforeEach } from "vitest";
import { JiraClient, JiraError } from "../jira/client.js";

const EXPECTED_AUTH = "Basic " + Buffer.from("test@example.com:test-token").toString("base64");

function mockFetch(status: number, body: unknown, ok = status >= 200 && status < 300) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    statusText: String(status),
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("JiraClient", () => {
  it("sends correct Basic Auth header", async () => {
    const fetch = mockFetch(200, { key: "TEST-1", fields: {} });
    vi.stubGlobal("fetch", fetch);

    await new JiraClient().get("/issue/TEST-1");

    const [, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(EXPECTED_AUTH);
  });

  it("builds URL from siteUrl config", async () => {
    const fetch = mockFetch(200, {});
    vi.stubGlobal("fetch", fetch);

    await new JiraClient().get("/project/search");

    const [url] = fetch.mock.calls[0] as [string];
    expect(url).toBe("https://test.atlassian.net/rest/api/3/project/search");
  });

  it("returns undefined on 204", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 204 }));
    const result = await new JiraClient().put("/issue/TEST-1", {});
    expect(result).toBeUndefined();
  });

  it("throws JiraError on non-ok response", async () => {
    vi.stubGlobal("fetch", mockFetch(404, { errorMessages: ["Not found"] }, false));

    await expect(new JiraClient().get("/issue/NOPE-1")).rejects.toThrow(JiraError);
    await expect(new JiraClient().get("/issue/NOPE-1")).rejects.toMatchObject({ status: 404 });
  });

  it("sets Content-Type on POST with body", async () => {
    const fetch = mockFetch(200, { id: "1", key: "T-1", self: "https://test.atlassian.net/rest/api/3/issue/T-1" });
    vi.stubGlobal("fetch", fetch);

    await new JiraClient().post("/issue", { fields: {} });

    const [, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("does not set Content-Type on GET", async () => {
    const fetch = mockFetch(200, {});
    vi.stubGlobal("fetch", fetch);

    await new JiraClient().get("/issue/T-1");

    const [, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
  });
});

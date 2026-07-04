import { describe, it, expect, vi, beforeEach } from "vitest";
import { getJiraIssueLinkTypes } from "../../tools/get-issue-link-types.js";
import { JiraClient } from "../../jira/client.js";

const client = new JiraClient();

beforeEach(() => vi.restoreAllMocks());

function jsonResponse(body: unknown, status = 200, ok = true) {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  };
}

describe("getJiraIssueLinkTypes", () => {
  it("returns mapped link types from response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          issueLinkTypes: [
            { id: "10001", name: "Blocks", inward: "is blocked by", outward: "blocks" },
            { id: "10002", name: "Relates", inward: "relates to", outward: "relates to" },
          ],
        })
      )
    );

    const result = (await getJiraIssueLinkTypes(client)) as Record<string, unknown>;
    const linkTypes = result.linkTypes as Array<Record<string, unknown>>;
    expect(linkTypes).toHaveLength(2);
    expect(linkTypes[0].id).toBe("10001");
    expect(linkTypes[0].name).toBe("Blocks");
    expect(linkTypes[0].inward).toBe("is blocked by");
    expect(linkTypes[0].outward).toBe("blocks");
  });

  it("returns empty linkTypes array when none exist", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ issueLinkTypes: [] })));

    const result = (await getJiraIssueLinkTypes(client)) as Record<string, unknown>;
    expect((result.linkTypes as unknown[]).length).toBe(0);
  });

  it("maps all four link type fields", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          issueLinkTypes: [
            {
              id: "42",
              name: "Cloners",
              inward: "is cloned by",
              outward: "clones",
            },
          ],
        })
      )
    );

    const result = (await getJiraIssueLinkTypes(client)) as Record<string, unknown>;
    const linkType = (result.linkTypes as Array<Record<string, unknown>>)[0];
    expect(linkType.id).toBe("42");
    expect(linkType.name).toBe("Cloners");
    expect(linkType.inward).toBe("is cloned by");
    expect(linkType.outward).toBe("clones");
  });

  it("hits the /issueLinkType endpoint", async () => {
    let capturedUrl = "";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        capturedUrl = url;
        return Promise.resolve(jsonResponse({ issueLinkTypes: [] }));
      })
    );

    await getJiraIssueLinkTypes(client);
    expect(capturedUrl).toContain("/issueLinkType");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { getJiraTransitions } from "../../tools/get-transitions.js";
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

describe("getJiraTransitions", () => {
  it("returns transitions mapped from response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          transitions: [
            {
              id: "21",
              name: "In Progress",
              to: {
                id: "3",
                name: "In Progress",
                statusCategory: { id: 4, key: "indeterminate", name: "In Progress" },
              },
            },
          ],
        })
      )
    );

    const result = (await getJiraTransitions(
      { issueKey: "TEST-1" },
      client
    )) as Record<string, unknown>;
    expect(result.issueKey).toBe("TEST-1");
    const transitions = result.transitions as Array<Record<string, unknown>>;
    expect(transitions).toHaveLength(1);
    expect(transitions[0].id).toBe("21");
    expect(transitions[0].name).toBe("In Progress");
  });

  it("includes statusCategory in transition.to", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          transitions: [
            {
              id: "31",
              name: "Done",
              to: {
                id: "10001",
                name: "Done",
                statusCategory: { id: 3, key: "done", name: "Done" },
              },
            },
          ],
        })
      )
    );

    const result = (await getJiraTransitions(
      { issueKey: "TEST-2" },
      client
    )) as Record<string, unknown>;
    const transitions = result.transitions as Array<{
      to: { statusCategory: Record<string, unknown> };
    }>;
    expect(transitions[0].to.statusCategory).toEqual({
      id: 3,
      key: "done",
      name: "Done",
    });
  });

  it("trims whitespace from issueKey in URL", async () => {
    let capturedUrl = "";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        capturedUrl = url;
        return Promise.resolve(jsonResponse({ transitions: [] }));
      })
    );

    await getJiraTransitions({ issueKey: "  TEST-3  " }, client);
    expect(capturedUrl).toContain("TEST-3");
    expect(capturedUrl).not.toContain("  TEST-3  ");
  });

  it("returns empty transitions list when there are none", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ transitions: [] })));

    const result = (await getJiraTransitions(
      { issueKey: "TEST-1" },
      client
    )) as Record<string, unknown>;
    expect(result.transitions).toEqual([]);
  });
});

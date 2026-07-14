import { describe, it, expect, vi, beforeEach } from "vitest";
import { getJiraIssueTypes } from "../../tools/get-issue-types.js";
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

describe("getJiraIssueTypes", () => {
  it("returns mapped issue types from response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          issueTypes: [
            { id: "10001", name: "Task", subtask: false },
            { id: "10003", name: "Subtask", subtask: true },
          ],
        })
      )
    );

    const result = (await getJiraIssueTypes({ projectKey: "TEST" }, client)) as Record<string, unknown>;
    expect(result.projectKey).toBe("TEST");
    const issueTypes = result.issueTypes as Array<Record<string, unknown>>;
    expect(issueTypes).toHaveLength(2);
    expect(issueTypes[0]).toEqual({ id: "10001", name: "Task", subtask: false });
    expect(issueTypes[1]).toEqual({ id: "10003", name: "Subtask", subtask: true });
  });

  it("returns empty issueTypes array when none exist", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ issueTypes: [] })));

    const result = (await getJiraIssueTypes({ projectKey: "TEST" }, client)) as Record<string, unknown>;
    expect((result.issueTypes as unknown[]).length).toBe(0);
  });

  it("hits the /issue/createmeta/{projectKey}/issuetypes endpoint", async () => {
    let capturedUrl = "";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        capturedUrl = url;
        return Promise.resolve(jsonResponse({ issueTypes: [] }));
      })
    );

    await getJiraIssueTypes({ projectKey: "TEST" }, client);
    expect(capturedUrl).toContain("/issue/createmeta/TEST/issuetypes");
  });

  it("trims and uppercases the project key in the request path", async () => {
    let capturedUrl = "";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        capturedUrl = url;
        return Promise.resolve(jsonResponse({ issueTypes: [] }));
      })
    );

    await getJiraIssueTypes({ projectKey: "  test  " }, client);
    expect(capturedUrl).toContain("/TEST/");
  });

  it("returns an error object on a JiraError (e.g. 404 project not found)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ errorMessages: ["No project could be found with key 'NOPE'."] }, 404, false)
      )
    );

    const result = (await getJiraIssueTypes({ projectKey: "NOPE" }, client)) as Record<string, unknown>;
    expect(result.status).toBe(404);
    expect(result.error).toBeDefined();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { assignIssueToEpic } from "../../tools/assign-to-epic.js";
import { JiraClient, JiraError } from "../../jira/client.js";

const client = new JiraClient();

beforeEach(() => vi.restoreAllMocks());

describe("assignIssueToEpic", () => {
  it("PUTs fields.parent = { key: epicKey } and reports via: 'parent' on success", async () => {
    const putSpy = vi.spyOn(client, "put").mockResolvedValueOnce(undefined);

    const result = (await assignIssueToEpic(
      { issueKey: "TEST-1", epicKey: "EPIC-1" },
      client
    )) as Record<string, unknown>;

    expect(putSpy).toHaveBeenCalledTimes(1);
    expect(putSpy).toHaveBeenCalledWith("/issue/TEST-1", { fields: { parent: { key: "EPIC-1" } } });
    expect(result).toEqual({ success: true, issueKey: "TEST-1", epicKey: "EPIC-1", via: "parent" });
  });

  it("falls back to customfield_10014 when the parent field is rejected (legacy classic project)", async () => {
    const putSpy = vi
      .spyOn(client, "put")
      .mockRejectedValueOnce(new JiraError("Jira API 400 Bad Request: /issue/TEST-1", 400, '{"errors":{"parent":"field \'parent\' cannot be set"}}'))
      .mockResolvedValueOnce(undefined);

    const result = (await assignIssueToEpic(
      { issueKey: "TEST-1", epicKey: "EPIC-1" },
      client
    )) as Record<string, unknown>;

    expect(putSpy).toHaveBeenCalledTimes(2);
    expect(putSpy).toHaveBeenNthCalledWith(1, "/issue/TEST-1", { fields: { parent: { key: "EPIC-1" } } });
    expect(putSpy).toHaveBeenNthCalledWith(2, "/issue/TEST-1", { fields: { customfield_10014: "EPIC-1" } });
    expect(result).toEqual({ success: true, issueKey: "TEST-1", epicKey: "EPIC-1", via: "customfield_10014" });
  });

  it("does not retry and surfaces the original error when the 400 does not mention parent", async () => {
    const putSpy = vi
      .spyOn(client, "put")
      .mockRejectedValueOnce(new JiraError("Jira API 400 Bad Request: /issue/NOPE-1", 400, '{"errorMessages":["Issue does not exist"]}'));

    const result = (await assignIssueToEpic(
      { issueKey: "NOPE-1", epicKey: "EPIC-1" },
      client
    )) as Record<string, unknown>;

    expect(putSpy).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      error: "Jira API 400 Bad Request: /issue/NOPE-1",
      status: 400,
      body: '{"errorMessages":["Issue does not exist"]}',
    });
  });

  it("surfaces the fallback PUT's own failure as a normal error, not swallowed", async () => {
    const putSpy = vi
      .spyOn(client, "put")
      .mockRejectedValueOnce(new JiraError("Jira API 400 Bad Request: /issue/TEST-1", 400, '{"errors":{"parent":"field \'parent\' cannot be set"}}'))
      .mockRejectedValueOnce(new JiraError("Jira API 500 Internal Server Error: /issue/TEST-1", 500, '{"errorMessages":["Internal error"]}'));

    const result = (await assignIssueToEpic(
      { issueKey: "TEST-1", epicKey: "EPIC-1" },
      client
    )) as Record<string, unknown>;

    expect(putSpy).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      error: "Jira API 500 Internal Server Error: /issue/TEST-1",
      status: 500,
      body: '{"errorMessages":["Internal error"]}',
    });
  });

  it("upcases and trims issue and epic keys", async () => {
    const putSpy = vi.spyOn(client, "put").mockResolvedValueOnce(undefined);

    await assignIssueToEpic({ issueKey: "  test-1  ", epicKey: "  epic-1  " }, client);

    expect(putSpy).toHaveBeenCalledWith("/issue/TEST-1", { fields: { parent: { key: "EPIC-1" } } });
  });
});

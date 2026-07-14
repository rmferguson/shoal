import { describe, it, expect } from "vitest";
import { hintForIssueError } from "../../tools/issue-type-hints.js";
import { JiraError } from "../../jira/client.js";

describe("hintForIssueError", () => {
  it("returns an issuetype hint mentioning getJiraIssueTypes when ctx.issueType is set and the 400 body mentions issuetype", () => {
    const err = new JiraError(
      "Jira API 400 Bad Request: /issue",
      400,
      '{"errors":{"issuetype":"valid values are ..."}}'
    );

    const hint = hintForIssueError(err, { projectKey: "TEST", issueType: "Sub-task" });

    expect(hint).toBeDefined();
    expect(hint).toContain("getJiraIssueTypes");
  });

  it("returns a parent hint mentioning customfield_10014 and getJiraIssueTypes when the 400 body mentions parent", () => {
    const err = new JiraError(
      "Jira API 400 Bad Request: /issue",
      400,
      '{"errors":{"parent":"field \'parent\' cannot be set"}}'
    );

    const hint = hintForIssueError(err, { projectKey: "TEST", parent: "EPIC-1" });

    expect(hint).toBeDefined();
    expect(hint).toContain("customfield_10014");
    expect(hint).toContain("getJiraIssueTypes");
  });

  it("returns undefined for an unrelated 400 (mentions neither issuetype nor parent)", () => {
    const err = new JiraError(
      "Jira API 400 Bad Request: /issue",
      400,
      '{"errorMessages":["Field \'summary\' is required."]}'
    );

    const hint = hintForIssueError(err, { projectKey: "TEST", issueType: "Task", parent: "EPIC-1" });

    expect(hint).toBeUndefined();
  });

  it("returns undefined for a non-JiraError (plain Error)", () => {
    const err = new Error("boom");

    const hint = hintForIssueError(err, { projectKey: "TEST", issueType: "Task", parent: "EPIC-1" });

    expect(hint).toBeUndefined();
  });

  it("returns undefined for a non-JiraError named AbortError", () => {
    const err = new Error("The operation was aborted.");
    err.name = "AbortError";

    const hint = hintForIssueError(err, { projectKey: "TEST", issueType: "Task", parent: "EPIC-1" });

    expect(hint).toBeUndefined();
  });

  it("suppresses the issuetype hint when ctx.issueType is omitted, even if the body mentions issuetype", () => {
    const err = new JiraError(
      "Jira API 400 Bad Request: /issue",
      400,
      '{"errors":{"issuetype":"valid values are ..."}}'
    );

    const hint = hintForIssueError(err, { projectKey: "TEST" });

    expect(hint).toBeUndefined();
  });

  it("still fires the parent hint when ctx.issueType is omitted but the body mentions parent (confirms the two branches are independent)", () => {
    const err = new JiraError(
      "Jira API 400 Bad Request: /issue",
      400,
      '{"errors":{"parent":"field \'parent\' cannot be set"}}'
    );

    const hint = hintForIssueError(err, { projectKey: "TEST", parent: "EPIC-1" });

    expect(hint).toBeDefined();
    expect(hint).toContain("customfield_10014");
  });
});

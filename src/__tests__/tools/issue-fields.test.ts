import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractIssueFields } from "../../tools/issue-fields.js";

beforeEach(() => vi.restoreAllMocks());

describe("extractIssueFields — fully-populated fields", () => {
  it("extracts summary and unwraps nested .name/.displayName into flat strings", () => {
    const fields = {
      summary: "Fix login bug",
      status: { name: "In Progress" },
      assignee: { displayName: "Alice" },
      priority: { name: "High" },
      issuetype: { name: "Bug" },
    };
    // Source: discovered during implementation, no prior spec
    // Behavior: each standard field is extracted from its nested object into a flat string on the result
    const result = extractIssueFields(fields);
    expect(result.summary).toBe("Fix login bug");
    expect(result.status).toBe("In Progress");
    expect(result.assignee).toBe("Alice");
    expect(result.priority).toBe("High");
    expect(result.issueType).toBe("Bug");
  });
});

describe("extractIssueFields — missing or absent fields", () => {
  it("returns undefined for every standard field when fields object is empty", () => {
    // Source: discovered during implementation, no prior spec
    // Behavior: optional chaining on absent keys produces undefined without throwing
    const result = extractIssueFields({});
    expect(result.summary).toBeUndefined();
    expect(result.status).toBeUndefined();
    expect(result.assignee).toBeUndefined();
    expect(result.priority).toBeUndefined();
    expect(result.issueType).toBeUndefined();
  });

  it("returns undefined for status when the status object lacks a name property", () => {
    // Source: discovered during implementation, no prior spec
    // Behavior: object present but name absent → optional chaining yields undefined
    const result = extractIssueFields({ status: {} });
    expect(result.status).toBeUndefined();
  });

  it("returns undefined for assignee when assignee is null", () => {
    // Source: discovered during implementation, no prior spec
    // Behavior: null is cast to the assignee type, and ?. on null produces undefined
    const result = extractIssueFields({ assignee: null });
    expect(result.assignee).toBeUndefined();
  });
});

describe("extractIssueFields — customFields collection", () => {
  it("collects all customfield_* keys into the customFields map", () => {
    const fields = {
      customfield_10016: 5,
      customfield_99999: "foo",
    };
    // Source: discovered during implementation, no prior spec
    // Behavior: any key starting with "customfield_" is included in customFields
    const result = extractIssueFields(fields);
    expect(result.customFields).toEqual({ customfield_10016: 5, customfield_99999: "foo" });
  });

  it("excludes non-customfield_ keys from customFields", () => {
    const fields = {
      summary: "Test",
      status: { name: "Done" },
      customfield_10016: 8,
    };
    // Source: discovered during implementation, no prior spec
    // Behavior: standard keys like summary and status are NOT mirrored into customFields
    const result = extractIssueFields(fields);
    expect(result.customFields).not.toHaveProperty("summary");
    expect(result.customFields).not.toHaveProperty("status");
    expect(result.customFields).toHaveProperty("customfield_10016", 8);
  });

  it("returns an empty object for customFields when no customfield_ keys are present", () => {
    // Source: discovered during implementation, no prior spec
    // Behavior: absence of customfield_ keys produces {} not undefined
    const result = extractIssueFields({ summary: "Hello" });
    expect(result.customFields).toEqual({});
  });

  it("includes customfield_ keys whose value is null", () => {
    // Source: discovered during implementation, no prior spec
    // Behavior: the loop does not filter by value — null custom fields are still collected
    const result = extractIssueFields({ customfield_10016: null });
    expect(result.customFields).toHaveProperty("customfield_10016", null);
  });
});

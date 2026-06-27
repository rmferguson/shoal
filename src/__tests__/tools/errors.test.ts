import { describe, it, expect, vi, beforeEach } from "vitest";
import { toToolError } from "../../tools/errors.js";
import { JiraError } from "../../jira/client.js";

beforeEach(() => vi.restoreAllMocks());

describe("toToolError — JiraError", () => {
  it("returns {error, status, body} without throwing", () => {
    const err = new JiraError("Not found", 404, '{"error":"issue not found"}');
    // Source: discovered during implementation, no prior spec
    // Behavior: JiraError is converted to a plain result object carrying message, HTTP status, and raw body
    const result = toToolError(err) as Record<string, unknown>;
    expect(result.error).toBe("Not found");
    expect(result.status).toBe(404);
    expect(result.body).toBe('{"error":"issue not found"}');
  });

  it("captures server error status codes faithfully", () => {
    const err = new JiraError("Internal server error", 500, "");
    // Source: discovered during implementation, no prior spec
    // Behavior: status is taken directly from JiraError.status, not derived
    const result = toToolError(err) as Record<string, unknown>;
    expect(result.status).toBe(500);
  });
});

describe("toToolError — AbortError", () => {
  it("returns the default timeout message when no custom message is provided", () => {
    const err = new Error("aborted");
    err.name = "AbortError";
    // Source: discovered during implementation, no prior spec
    // Behavior: AbortError with no second arg produces {error: "Request timed out."}
    const result = toToolError(err) as Record<string, unknown>;
    expect(result.error).toBe("Request timed out.");
  });

  it("returns the caller-supplied message when the second argument is given", () => {
    const err = new Error("aborted");
    err.name = "AbortError";
    // Source: discovered during implementation, no prior spec
    // Behavior: second argument overrides the default timeout message string
    const result = toToolError(err, "Custom timeout for this tool.") as Record<string, unknown>;
    expect(result.error).toBe("Custom timeout for this tool.");
  });

  it("includes only the error key — no status or body — in the AbortError result", () => {
    const err = new Error("aborted");
    err.name = "AbortError";
    // Source: discovered during implementation, no prior spec
    // Behavior: AbortError result shape is {error} only; status and body are absent
    const result = toToolError(err) as Record<string, unknown>;
    expect(result.status).toBeUndefined();
    expect(result.body).toBeUndefined();
  });
});

describe("toToolError — unknown error type", () => {
  it("re-throws standard errors that are neither JiraError nor AbortError", () => {
    const err = new TypeError("unexpected failure");
    // Source: discovered during implementation, no prior spec
    // Behavior: unrecognised error types are re-thrown, not swallowed or wrapped
    expect(() => toToolError(err)).toThrow(err);
  });

  it("re-throws an Error whose name was set to a non-AbortError string", () => {
    const err = new Error("network problem");
    err.name = "NetworkError";
    // Source: discovered during implementation, no prior spec
    // Behavior: name check is exact — only "AbortError" matches; any other name causes re-throw
    expect(() => toToolError(err)).toThrow(err);
  });
});

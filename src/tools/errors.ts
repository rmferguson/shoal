import { JiraError } from "../jira/client.js";

/**
 * Converts a caught error into a tool result object, or re-throws if it is
 * not a known error type.
 *
 * - JiraError  → { error, status, body }
 * - AbortError → { error: timeoutMessage }
 * - anything else → re-thrown
 */
export function toToolError(
  err: unknown,
  timeoutMessage = "Request timed out."
): unknown {
  if (err instanceof JiraError) {
    return { error: err.message, status: err.status, body: err.body };
  }
  if (err instanceof Error && err.name === "AbortError") {
    return { error: timeoutMessage };
  }
  throw err;
}

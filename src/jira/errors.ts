import { JiraError } from "./client.js";
import { toToolError as baseToToolError } from "../tools/errors.js";

/**
 * Converts a caught error into a Jira tool result object, or re-throws if it is
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
  return baseToToolError(err, timeoutMessage);
}

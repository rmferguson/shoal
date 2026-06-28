/**
 * Converts a caught error into a tool result object, or re-throws if it is
 * not a known error type.
 *
 * - AbortError → { error: timeoutMessage }
 * - anything else → re-thrown
 *
 * For Jira-specific error handling (JiraError), use toToolError from
 * src/jira/errors.ts instead.
 */
export function toToolError(
  err: unknown,
  timeoutMessage = "Request timed out."
): unknown {
  if (err instanceof Error && err.name === "AbortError") {
    return { error: timeoutMessage };
  }
  throw err;
}

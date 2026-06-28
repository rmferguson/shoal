import { GitHubError } from "../../github/client.js";

/**
 * Converts a caught error into a tool result object, or re-throws if it is
 * not a known GitHub error type.
 *
 * - GitHubError → { error, status, body }
 * - anything else → re-thrown
 */
export function handleGitHubError(err: unknown): { error: string; status: number; body: string } {
  if (err instanceof GitHubError) {
    return { error: err.message, status: err.status, body: err.body };
  }
  throw err;
}

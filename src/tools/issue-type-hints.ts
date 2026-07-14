import { JiraError } from "../jira/client.js";

interface IssueErrorContext {
  projectKey: string;
  issueType?: string; // omitted by updateJiraIssue, which has no issueType field
  parent?: string;
}

/**
 * True when a 400 response body indicates Jira rejected the `issuetype` field
 * itself (e.g. an issue type name that doesn't exist in this project, most
 * commonly a guessed subtask type name like "Sub-task" when the project
 * actually uses "Subtask" or a custom name).
 */
function isIssueTypeRejection(err: unknown): boolean {
  if (!(err instanceof JiraError) || err.status !== 400) return false;
  return /\bissuetype\b/i.test(err.body);
}

/**
 * True when a 400 response body indicates Jira rejected the `parent` field
 * itself (legacy classic projects that still use the customfield_10014 Epic
 * Link model, or a parent that isn't valid for the target issue type).
 */
function isParentRejection(err: unknown): boolean {
  if (!(err instanceof JiraError) || err.status !== 400) return false;
  return /\bparent\b/i.test(err.body);
}

function issueTypeHint(ctx: IssueErrorContext): string {
  return `"${ctx.issueType}" is not a valid issue type for project ${ctx.projectKey}. Call getJiraIssueTypes({ projectKey: "${ctx.projectKey}" }) to see this project's exact issue type names — including the correct subtask type name (e.g. "Subtask" vs "Sub-task" vs a custom name), which varies per project and cannot be guessed.`;
}

function parentHint(ctx: IssueErrorContext): string {
  return `Jira rejected the parent field for ${ctx.projectKey}. Two possible causes: (1) a legacy classic project, where parent isn't used for epic links at all — pass customFields: { "customfield_10014": "<epicKey>" } instead (see assignIssueToEpic); or (2) a next-gen project where parent "${ctx.parent}" is not an Epic — parent only accepts direct Task/Story/Bug-under-Epic nesting, and nesting under any other issue type requires issueType to be this project's actual subtask type, not a guess. Call getJiraIssueTypes({ projectKey: "${ctx.projectKey}" }) to find the right name for either case.`;
}

/**
 * Inspects a caught error against the fields that were sent, and returns a
 * remediation hint string when the error matches a known issue-type or
 * parent-field rejection pattern. Returns undefined for any other error —
 * callers should fall back to the normal toToolError() message in that case.
 */
export function hintForIssueError(err: unknown, ctx: IssueErrorContext): string | undefined {
  if (ctx.issueType !== undefined && isIssueTypeRejection(err)) return issueTypeHint(ctx);
  if (isParentRejection(err)) return parentHint(ctx);
  return undefined;
}

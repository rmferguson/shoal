export interface IssueFields {
  summary: string | undefined;
  status: string | undefined;
  assignee: string | undefined;
  priority: string | undefined;
  issueType: string | undefined;
  customFields: Record<string, unknown>;
}

/**
 * Extract the standard set of fields shared across Jira issue responses.
 * Both getJiraIssue and searchJiraIssuesUsingJql use this to avoid duplicating
 * the type-casting and custom field collection logic.
 */
export function extractIssueFields(fields: Record<string, unknown>): IssueFields {
  const status = fields["status"] as { name?: string } | undefined;
  const assignee = fields["assignee"] as { displayName?: string } | undefined;
  const priority = fields["priority"] as { name?: string } | undefined;
  const issuetype = fields["issuetype"] as { name?: string } | undefined;

  const customFields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (key.startsWith("customfield_")) {
      customFields[key] = value;
    }
  }

  return {
    summary: fields["summary"] as string | undefined,
    status: status?.name,
    assignee: assignee?.displayName,
    priority: priority?.name,
    issueType: issuetype?.name,
    customFields,
  };
}

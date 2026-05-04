import { z } from "zod";
import { JiraClient, JiraError } from "../jira/client.js";

export const AddAttachmentInput = z.object({
  sessionId: z.string().describe("Session ID from OAuth flow"),
  issueKey: z.string().describe("Jira issue key, e.g. PROJ-123"),
  filename: z.string().describe("Name of the file to attach"),
  content: z.string().describe("Base64-encoded file content"),
  mimeType: z
    .string()
    .optional()
    .default("application/octet-stream")
    .describe("MIME type of the file (default: application/octet-stream)"),
});

export type AddAttachmentInput = z.infer<typeof AddAttachmentInput>;

interface AttachmentResponse {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  created: string;
}

export async function addAttachmentToJiraIssue(input: AddAttachmentInput): Promise<unknown> {
  const { sessionId, issueKey, filename, content, mimeType } = input;
  const client = new JiraClient(sessionId);

  try {
    const buffer = Buffer.from(content, "base64");
    const form = new FormData();
    form.append("file", new Blob([buffer], { type: mimeType }), filename);

    const attachments = await client.upload<AttachmentResponse[]>(
      `/issue/${encodeURIComponent(issueKey.trim())}/attachments`,
      form
    );

    return attachments.map((a) => ({
      id: a.id,
      filename: a.filename,
      size: a.size,
      mimeType: a.mimeType,
      created: a.created,
    }));
  } catch (err) {
    if (err instanceof JiraError) {
      return { error: err.message, status: err.status };
    }
    if (err instanceof Error && err.name === "AbortError") {
      return { error: `Request timed out uploading attachment to ${issueKey}.` };
    }
    throw err;
  }
}

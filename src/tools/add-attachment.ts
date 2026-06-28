import { z } from "zod";
import { JiraClient } from "../jira/client.js";
import { toToolError } from "../jira/errors.js";

export const AddAttachmentInput = z.object({
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

export async function addAttachmentToJiraIssue(input: AddAttachmentInput, client: JiraClient): Promise<unknown> {
  const { issueKey, filename, content, mimeType } = input;

  try {
    const buffer = Buffer.from(content, "base64");
    const form = new FormData();
    form.append("file", new Blob([buffer], { type: mimeType }), filename);

    const attachments = await client.upload<AttachmentResponse[]>(
      `/issue/${encodeURIComponent(issueKey.trim())}/attachments`,
      form
    );

    return attachments.map((attachment) => ({
      id: attachment.id,
      filename: attachment.filename,
      size: attachment.size,
      mimeType: attachment.mimeType,
      created: attachment.created,
    }));
  } catch (err) {
    return toToolError(err, `Request timed out uploading attachment to ${issueKey}.`);
  }
}

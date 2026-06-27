export interface AdfNode {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: AdfNode[];
  version?: number;
}

/**
 * Wraps plain text in an ADF doc > paragraph > text structure.
 * Use for descriptions and plain-text comments.
 */
export function plainTextToAdf(text: string): AdfNode {
  return {
    type: "doc",
    version: 1,
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

/**
 * Builds an ADF body with optional @mention nodes appended after the text.
 * Use for comments that may include user mentions.
 */
export function buildAdfWithMentions(
  body: string,
  mentions?: { accountId: string; displayName: string }[]
): AdfNode {
  const paragraphContent: AdfNode[] = [];

  if (body) paragraphContent.push({ type: "text", text: body });

  if (mentions?.length) {
    if (body) paragraphContent.push({ type: "text", text: " " });
    for (const mention of mentions) {
      paragraphContent.push({
        type: "mention",
        attrs: {
          id: mention.accountId,
          text: `@${mention.displayName}`,
          accessLevel: "APPLICATION",
        },
      });
    }
  }

  return {
    type: "doc",
    version: 1,
    content: [{ type: "paragraph", content: paragraphContent }],
  };
}

/**
 * Converts an ADF document back to plain readable text by recursively
 * extracting text nodes from the content tree.
 */
export function renderAdf(adf: unknown): string {
  if (!adf || typeof adf !== "object") return "";
  const node = adf as { type?: string; text?: string; content?: unknown[] };
  if (node.text) return node.text;
  if (Array.isArray(node.content)) {
    return node.content.map(renderAdf).join("");
  }
  return "";
}

import { describe, it, expect, vi, beforeEach } from "vitest";
import { plainTextToAdf, buildAdfWithMentions, renderAdf } from "../../tools/adf-utils.js";

beforeEach(() => vi.restoreAllMocks());

describe("plainTextToAdf", () => {
  it("wraps text in doc > paragraph > text ADF structure with version 1", () => {
    const result = plainTextToAdf("Hello world");
    // Source: discovered during implementation, no prior spec
    // Behavior: produces a doc node with version 1 containing a single paragraph containing a text node
    expect(result.type).toBe("doc");
    expect(result.version).toBe(1);
    expect(result.content?.[0].type).toBe("paragraph");
    expect(result.content?.[0].content?.[0]).toEqual({ type: "text", text: "Hello world" });
  });
});

describe("buildAdfWithMentions — body only", () => {
  it("produces a single text node in the paragraph when no mentions are provided", () => {
    const result = buildAdfWithMentions("Stand-alone body");
    // Source: discovered during implementation, no prior spec
    // Behavior: body-only call yields exactly one child in the paragraph — the text node
    const content = result.content?.[0].content ?? [];
    expect(content).toHaveLength(1);
    expect(content[0]).toEqual({ type: "text", text: "Stand-alone body" });
  });
});

describe("buildAdfWithMentions — body with mentions", () => {
  it("appends a space then a mention node after the body text", () => {
    const result = buildAdfWithMentions("See you", [{ accountId: "abc123", displayName: "Alice" }]);
    // Source: discovered during implementation, no prior spec
    // Behavior: body + 1 mention → [text, space, mention] (3 nodes)
    const content = result.content?.[0].content ?? [];
    expect(content).toHaveLength(3);
    expect(content[0]).toEqual({ type: "text", text: "See you" });
    expect(content[1]).toEqual({ type: "text", text: " " });
    expect(content[2]).toEqual({
      type: "mention",
      attrs: { id: "abc123", text: "@Alice", accessLevel: "APPLICATION" },
    });
  });

  it("appends all mention nodes when multiple mentions are given", () => {
    const result = buildAdfWithMentions("FYI", [
      { accountId: "u1", displayName: "Bob" },
      { accountId: "u2", displayName: "Carol" },
    ]);
    // Source: discovered during implementation, no prior spec
    // Behavior: body + 2 mentions → [text, space, mention, mention] (4 nodes)
    const content = result.content?.[0].content ?? [];
    expect(content).toHaveLength(4);
    expect(content[2]).toMatchObject({ type: "mention", attrs: { id: "u1", text: "@Bob" } });
    expect(content[3]).toMatchObject({ type: "mention", attrs: { id: "u2", text: "@Carol" } });
  });
});

describe("buildAdfWithMentions — empty body with mentions", () => {
  it("omits the text node and the separator space when body is empty", () => {
    const result = buildAdfWithMentions("", [{ accountId: "x1", displayName: "Dave" }]);
    // Source: discovered during implementation, no prior spec
    // Behavior: empty body means no text node is pushed and no space separator is inserted; paragraph starts directly with the mention
    const content = result.content?.[0].content ?? [];
    expect(content).toHaveLength(1);
    expect(content[0]).toMatchObject({ type: "mention", attrs: { id: "x1" } });
  });
});

describe("renderAdf", () => {
  it("returns empty string for null input", () => {
    // Source: discovered during implementation, no prior spec
    // Behavior: falsy guard at the top — null returns ""
    expect(renderAdf(null)).toBe("");
  });

  it("returns empty string for undefined input", () => {
    // Source: discovered during implementation, no prior spec
    // Behavior: falsy guard at the top — undefined returns ""
    expect(renderAdf(undefined)).toBe("");
  });

  it("returns the text property directly for a leaf text node", () => {
    // Source: discovered during implementation, no prior spec
    // Behavior: node.text short-circuits recursion and returns the text value
    expect(renderAdf({ type: "text", text: "leaf content" })).toBe("leaf content");
  });

  it("recursively concatenates text nodes across a nested content tree", () => {
    const adf = {
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Hello" },
            { type: "text", text: " world" },
          ],
        },
      ],
    };
    // Source: discovered during implementation, no prior spec
    // Behavior: content arrays are map+joined, so all text nodes are concatenated
    expect(renderAdf(adf)).toBe("Hello world");
  });

  it("returns empty string for a node that has neither text nor content", () => {
    // Source: discovered during implementation, no prior spec
    // Behavior: mention/hardBreak-style nodes with no text or content return ""
    expect(renderAdf({ type: "hardBreak" })).toBe("");
  });
});

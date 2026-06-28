import { vi } from "vitest";

/**
 * Stubs `fetch` to capture the JSON request body of the next call.
 * Used in Jira tool tests. Resolves with the parsed request body.
 *
 * The mock response is a superset of all fields the Jira tools read from
 * the response (add-comment needs `author.displayName`; create-issue needs
 * `key`/`self`), so every tool can run to completion without throwing.
 */
export function captureBody(): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url: string, init: RequestInit) => {
        resolve(JSON.parse(init.body as string));
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              id: "1",
              created: "2026-01-01",
              author: { displayName: "A", accountId: "abc" },
              key: "T-1",
              self: "url",
            }),
        });
      })
    );
  });
}

/**
 * Stubs `fetch` to capture the JSON request body of the next call.
 * Used in GitHub tool tests. Resolves with the parsed request body.
 *
 * The mock response is a superset of all fields the GitHub tools read from
 * the response (create-issue needs `number`/`title`/`html_url`;
 * add-comment needs `user.login`), so every tool can run to completion
 * without throwing.
 */
export function captureRequestBody(): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url: string, init: RequestInit) => {
        resolve(JSON.parse(init.body as string));
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              number: 10,
              title: "T",
              html_url: "url",
              id: 1,
              body: "B",
              created_at: "2026-01-01",
              user: { login: "A" },
            }),
          text: () => Promise.resolve(""),
        });
      })
    );
  });
}

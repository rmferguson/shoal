import { describe, it, expect, vi, beforeEach } from "vitest";
import { getJiraProjects } from "../../tools/get-projects.js";
import { JiraClient } from "../../jira/client.js";

const client = new JiraClient();

beforeEach(() => vi.restoreAllMocks());

const makeProject = (i: number) => ({
  id: String(10000 + i),
  key: `P${i}`,
  name: `Project ${i}`,
  projectTypeKey: "software",
  style: "next-gen",
});

function jsonResponse(body: unknown, status = 200, ok = true) {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  };
}

describe("getJiraProjects", () => {
  it("returns mapped projects from response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          total: 2,
          startAt: 0,
          maxResults: 50,
          values: [
            { id: "10000", key: "PROJ", name: "My Project", projectTypeKey: "software", style: "next-gen" },
            { id: "10001", key: "OPS", name: "Operations", projectTypeKey: "business", style: "classic" },
          ],
        })
      )
    );

    const result = (await getJiraProjects(
      { startAt: 0, maxResults: 50 },
      client
    )) as Record<string, unknown>;

    expect(result.total).toBe(2);
    expect(result.returned).toBe(2);
    expect(result.nextStartAt).toBeNull();
    const projects = result.projects as Array<Record<string, unknown>>;
    expect(projects).toHaveLength(2);
    expect(projects[0].key).toBe("PROJ");
    expect(projects[1].key).toBe("OPS");
  });

  it("returns nextStartAt when more results exist", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          total: 10,
          startAt: 0,
          maxResults: 5,
          values: Array.from({ length: 5 }, (_, i) => makeProject(i)),
        })
      )
    );

    const result = (await getJiraProjects(
      { startAt: 0, maxResults: 5 },
      client
    )) as Record<string, unknown>;
    expect(result.nextStartAt).toBe(5);
  });

  it("returns null nextStartAt when on the last page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          total: 7,
          startAt: 5,
          maxResults: 5,
          values: Array.from({ length: 2 }, (_, i) => makeProject(5 + i)),
        })
      )
    );

    const result = (await getJiraProjects(
      { startAt: 5, maxResults: 5 },
      client
    )) as Record<string, unknown>;
    expect(result.nextStartAt).toBeNull();
  });

  it("passes startAt and maxResults as query params", async () => {
    let capturedUrl = "";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        capturedUrl = url;
        return Promise.resolve(
          jsonResponse({ total: 0, startAt: 10, maxResults: 20, values: [] })
        );
      })
    );

    await getJiraProjects({ startAt: 10, maxResults: 20 }, client);
    expect(capturedUrl).toContain("startAt=10");
    expect(capturedUrl).toContain("maxResults=20");
  });

  it("maps all project fields", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          total: 1,
          startAt: 0,
          maxResults: 50,
          values: [
            {
              id: "42",
              key: "DEMO",
              name: "Demo",
              projectTypeKey: "business",
              style: "classic",
            },
          ],
        })
      )
    );

    const result = (await getJiraProjects(
      { startAt: 0, maxResults: 50 },
      client
    )) as Record<string, unknown>;
    const project = (result.projects as Array<Record<string, unknown>>)[0];
    expect(project.id).toBe("42");
    expect(project.key).toBe("DEMO");
    expect(project.name).toBe("Demo");
    expect(project.projectTypeKey).toBe("business");
    expect(project.style).toBe("classic");
  });
});

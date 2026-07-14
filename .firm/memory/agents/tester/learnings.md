# Learnings: tester

## Codebase Patterns
- Test framework: Vitest (`vitest.config.ts`); tests live in `src/__tests__/`
- Test setup at `src/__tests__/setup.ts`; Jira client tests at `src/__tests__/jira-client.test.ts`
- GitHub tools have their own test subdirectory: `src/__tests__/tools/`

## Codebase Patterns
- `vi.spyOn(client, "<method>").mockRejectedValueOnce(new JiraError(msg, status, body))` tests multi-call fallback/retry logic (e.g. `assignIssueToEpic`'s classic-project fallback) with precise per-call control, without fabricating full mock `Response` objects through `fetch` for each sequential call — still uses the real `JiraClient` instance per project convention (added: 2026-07-08, dispatch: implement-epic-shortcuts)
- Error-path tests for tools using `client.get`/`post`/`put` (not `upload`) stub `ok: false` on the shared `vi.stubGlobal("fetch", ...)` mock rather than spying on the client method directly — exercises the real `JiraClient.checkResponse` → `JiraError` construction path end-to-end (added: 2026-07-14, dispatch: implement-subtask-type-hints)
- When a test description says "confirms X while Y still holds," write two separate `it` blocks, not one with two assertions — a combined assertion gives an ambiguous failure signal when only one branch regresses (added: 2026-07-14, dispatch: implement-subtask-type-hints)

## Gotchas
- Shared fetch-capture helpers in Vitest must return a superset mock response covering all fields any caller reads — tools that access nested properties (e.g. `comment.author.displayName`, `user.login`) will throw if `json()` returns `{}` because `toToolError` re-throws unknown errors rather than swallowing them (added: 2026-06-27, dispatch: sprint-test-helpers)

## Gotchas (Zod / TypeScript)
- `z.string().optional().default('...')` produces a required field in `z.infer<>` (the output type). Calling tool functions directly in tests without the defaulted field causes `tsc` errors even though Vitest passes at runtime. Fix: use `SchemaInput.parse({...})` to apply defaults before calling the function (added: 2026-06-27, dispatch: sprint-test-coverage)
- `addAttachmentToJiraIssue` uses `client.upload()` which sends `FormData` — `captureBody()` from `helpers.ts` does not work here because it calls `JSON.parse(init.body)`. Use `vi.stubGlobal('fetch', ...)` directly and assert `init.body instanceof FormData` instead (added: 2026-06-27, dispatch: sprint-test-coverage)
- Trying to temporarily mutate `src/tools/*.ts` (e.g. via `sed`) to prove a new test fails against unfixed code is blocked by the sandbox's auto-mode classifier when the dispatch scopes a tester to test-files-only — it's treated as irreversible local destruction regardless of intent to revert. When scope excludes production files, verify wiring by reading the source carefully instead (added: 2026-07-14, dispatch: implement-subtask-type-hints)

## Preferences
- (none yet)

## Cross-Agent Notes
- (from backend) `toToolError()` (both `src/tools/errors.ts` and `src/jira/errors.ts` versions) returns type `unknown`, not spreadable — any test asserting on a merged `{ ...base, hint }` shape should know `hint` is only spread onto the result after a cast to `Record<string, unknown>` in the tool code itself (added: 2026-07-14, dispatch: implement-subtask-type-hints)
- (from backend) New tool `getJiraIssueTypes`: input `{ projectKey: string }`, response `{ projectKey, issueTypes: [{ id, name, subtask }] }` via `GET /issue/createmeta/{projectKey}/issuetypes`. `createJiraIssue`'s and `updateJiraIssue`'s error responses can now carry an optional `hint: string` alongside `{ error, status, body }` — appears only when the 400 body matches `/\bissuetype\b/i` (createIssue only) or `/\bparent\b/i` (both tools). Test: hint on issuetype-rejection 400 (createIssue only), hint on parent-rejection 400 (both tools), no hint on unrelated 400 or timeout, and exactly one `fetch` call still happens on the createIssue enriched-error path (added: 2026-07-14, dispatch: implement-subtask-type-hints)
- (from backend) `assignIssueToEpic`'s legacy-classic-project fallback (`fields.parent` rejected → retry with `customfield_10014`) is untested against a real legacy Jira instance. Detection heuristic: `err instanceof JiraError && err.status === 400 && /\bparent\b/i.test(err.body)`. Worth probing: (1) a 400 naming `parent` triggers the fallback, (2) a 400 for an unrelated reason does NOT trigger it and surfaces the original error, (3) a failing `customfield_10014` retry surfaces as a normal `toToolError` result, not swallowed (added: 2026-07-08, dispatch: implement-epic-shortcuts)
- (from backend) No unassign/remove-from-epic tool exists alongside `createJiraEpic`/`assignIssueToEpic` — explicitly out of scope for that dispatch, not an oversight; don't flag its absence as a coverage gap (added: 2026-07-08, dispatch: implement-epic-shortcuts)

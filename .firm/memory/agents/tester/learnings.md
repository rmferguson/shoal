# Learnings: tester

## Codebase Patterns
- Test framework: Vitest (`vitest.config.ts`); tests live in `src/__tests__/`
- Test setup at `src/__tests__/setup.ts`; Jira client tests at `src/__tests__/jira-client.test.ts`
- GitHub tools have their own test subdirectory: `src/__tests__/tools/`

## Gotchas
- Shared fetch-capture helpers in Vitest must return a superset mock response covering all fields any caller reads — tools that access nested properties (e.g. `comment.author.displayName`, `user.login`) will throw if `json()` returns `{}` because `toToolError` re-throws unknown errors rather than swallowing them (added: 2026-06-27, dispatch: sprint-test-helpers)

## Gotchas (Zod / TypeScript)
- `z.string().optional().default('...')` produces a required field in `z.infer<>` (the output type). Calling tool functions directly in tests without the defaulted field causes `tsc` errors even though Vitest passes at runtime. Fix: use `SchemaInput.parse({...})` to apply defaults before calling the function (added: 2026-06-27, dispatch: sprint-test-coverage)
- `addAttachmentToJiraIssue` uses `client.upload()` which sends `FormData` — `captureBody()` from `helpers.ts` does not work here because it calls `JSON.parse(init.body)`. Use `vi.stubGlobal('fetch', ...)` directly and assert `init.body instanceof FormData` instead (added: 2026-06-27, dispatch: sprint-test-coverage)

## Preferences
- (none yet)

## Cross-Agent Notes
- (none yet)

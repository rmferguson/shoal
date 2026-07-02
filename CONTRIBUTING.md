# Contributing to Shoal

## Issues

Bug reports and feature requests go in [GitHub Issues](https://github.com/rmferguson/shoal/issues). When reporting a bug, include:

- The tool name and input you called it with
- The response you got vs. what you expected
- Your MCP client (Claude Code, Cursor, etc.)

## Pull Requests

1. Fork the repo and create a branch from `main`
2. Install dependencies: `npm install`
3. Make your changes
4. Add or update tests — every tool has a corresponding test file in `src/__tests__/`
5. Run `npm test` and `npm run typecheck` — both must pass
6. Open a PR against `main`

## Development

```bash
npm run dev          # run the server from source
npm test             # run test suite (Vitest)
npm run typecheck    # type-check without building
npm run build        # compile to dist/
```

Tests use Vitest and mock the HTTP layer — no live Jira credentials needed.

## Design constraints

These are intentional and should not be changed without discussion:

- **No retry on `createJiraIssue`** — the Atlassian server's double-create bug (#132) is caused by retry logic. One POST, no retry.
- **No field filtering in `getJiraIssue` / `searchJiraIssuesUsingJql`** — custom fields including story points must always be returned.
- **ADF for all write operations** — plain text bodies are rejected by Jira or strip @mentions. Always wrap in `doc > paragraph > text`.
- **Components as objects** — `[{ name: "..." }]`, not plain strings.

## License

By contributing, you agree your contributions will be licensed under the [Apache 2.0 License](LICENSE).

# Retrospective History

## Retro: 2026-07-04
- Tasks completed: 1 (/implement single-task dispatch — empty-body JSON parse fix in JiraClient)
- New learnings: 3 to backend (Codebase Patterns 1, Gotchas 1, Preferences 1), 2 to project MEMORY.md, 1 to docs/jira-api.md
- Pruned/archived: 0
- Key insight: JiraClient.request<T>() gated empty-body handling on status===204 only; Jira's POST /rest/api/3/issueLink returns 201 with an empty body, so the check never caught it — the bug was 100% reproducible on every successful link creation, not intermittent as an external consuming project's memory had assumed

## Retro: 2026-06-27 (session 4)
- Tasks completed: 5 (parallel worktree sprint — all refactor)
- New learnings: 11 across 2 members (backend: 10, tester: 1)
- Pruned/archived: 0
- Key insight: Provider-specific error layers (`src/jira/errors.ts`, `src/tools/github/errors.ts`) emerged naturally from the errors.ts decoupling task — the pattern was implied by the architecture, not planned

## Retro: 2026-06-27 (session 3)
- Tasks completed: 0 (test-after pass + infrastructure fix)
- New learnings: 2 added to project memory
- Pruned/archived: 0
- Key insight: .claude/worktrees/ pollutes vitest test discovery; exclude .claude/** in vitest config and prune worktrees immediately after merging

## Retro: 2026-06-27 (session 2)
- Tasks completed: 10 (1 resolved as side-effect, 1 deleted)
- New learnings: 4 workflow patterns added to project memory
- Pruned/archived: 0
- Key insight: Shared error extraction (toToolError) incidentally fixed a latent AbortError re-throw in two tools — extraction work reveals cross-caller inconsistency as a free side-effect

## Retro: 2026-06-27
- Tasks completed: 0 dispatched (setup-only session)
- New learnings: 4 seeded across 4 members (architect, backend, tester, technical-writer)
- Pruned/archived: 0
- Key insight: Existing team.yaml reflected an abandoned hosted-server vision; the current codebase is a local stdio server with two providers (Jira + GitHub)

## Retro: 2026-07-02
- Tasks completed: 0 team-member tasks (session was orchestrator + devops/Explore agents, no team.yaml members dispatched)
- New learnings: 2 project memory files updated (project-evolution.md refreshed for the GitHub Issues revert, npm-publishing.md added), 2 workflow patterns added
- Pruned/archived: 0
- Key insight: v1.0.0 published to npm and github.com/rmferguson/shoal made public; the GitHub Issues revert had left collateral staleness (duplicate entrypoint, stale dist/, stale CHANGELOG, stale architect learnings, stale repo description) that had to be swept before publish

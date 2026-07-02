# npm Publishing — Notes and Gotchas

Notes from actually publishing `@aquarium-tools/shoal` and going open source, not a copy of npm's docs.

---

## Scoped package checklist

- Remove `"private": true` from `package.json` — it silently blocks `npm publish` with no other error explanation until you check for it.
- Set `"publishConfig": {"access": "public"}`. Scoped packages (`@scope/name`) publish as private by default; without this, `npm publish` fails asking for `--access public` on every single publish.
- Add a `"repository"` field pointing at the GitHub repo. npmjs.com uses it to rewrite the README's relative links (e.g. `docs/tools.md`) to GitHub blob URLs on the package page — without it, those links 404 for anyone browsing npmjs.com.

## `prepublishOnly` must clean before rebuilding

Use `"prepublishOnly": "rm -rf dist && npm run build"`, not just `"npm run build"`. `tsc` does not delete output files for source files that were removed since the last build. When a feature gets reverted (source files deleted), the old compiled `.js`/`.d.ts` files for it stay in `dist/` indefinitely — a plain rebuild won't remove them, and they'll ship in the next `npm publish` tarball. Verify with `npm publish --dry-run` before every real publish; it lists the exact tarball contents.

## OIDC Trusted Publishing bootstrap order

A package must already exist on npmjs.com before a Trusted Publisher can be configured for it (Settings → Trusted publishing on the package's npm page). There's no "create empty package" flow on npmjs.com — the package page is created by the first `npm publish`. So:

1. First publish is always manual: `npm publish` (expect a 2FA prompt — `npm publish --otp=<code>`).
2. Configure Trusted Publishing on the now-existing package page, pointing at the repo and the exact workflow file path (e.g. `rmferguson/shoal`, `.github/workflows/publish.yml`).
3. From then on, `git tag vX.Y.Z && git push --tags` triggers the workflow and publishes with **zero** OTP prompt — the workflow authenticates via a GitHub Actions OIDC token (`permissions: id-token: write`), no `NPM_TOKEN` secret needed.

The workflow's publish job also needs `npx --yes npm@latest publish` rather than a bare `npm publish` — Trusted Publishing requires npm CLI ≥ 11.5.1, which a runner's bundled npm isn't guaranteed to have. And per npm's current Trusted Publishing docs, disable package-manager caching (`cache: npm` on `actions/setup-node`) specifically in the job that performs the publish — caching is fine in a preceding test job, not in the publish job itself.

## Release sequencing

Push all commits → `npm publish` → flip the GitHub repo to public (if it was private during development). Flipping visibility before pushing exposes a stale or broken intermediate state (e.g. a `package.json` still marked `private: true`, or missing CI) to anyone who looks.

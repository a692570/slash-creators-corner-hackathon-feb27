# Release Freeze Policy (Hackathon)

Applies from T-24 hours before presentation start.

## Freeze Window

- Start: Thursday, February 26, 2026 at 5:00 PM local time
- End: After final presentation on Friday, February 27, 2026

## Rules

1. No new features.
2. Bugfix-only changes allowed.
3. Every change must pass `npm run smoke`.
4. Prefer one reviewer before merge (if available).
5. No dependency upgrades during freeze.

## Branching

1. Create freeze branch from main:
   - `git checkout -b codex/release-freeze-2026-02-27`
2. Only cherry-pick critical fixes into freeze branch.
3. Tag pre-demo build:
   - `git tag demo-freeze-2026-02-27`

## Critical Fix Criteria

Allowed:
- Broken primary demo path
- Broken smoke-test endpoint
- Production safety regression in existing code

Not allowed:
- UI polish tweaks
- New integration experiments
- Refactors without direct demo impact

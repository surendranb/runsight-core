# RunSight Repository Model

This document explains how the active RunSight repositories work together.

## Roles

### `runsight-web`

`runsight-web` is the primary development and production-validation channel.

It is where maintainers:
- develop and validate product changes
- test the real Netlify, Supabase, and Strava contract
- harden the release before publication

### `runsight-core`

`runsight-core` is the primary public distribution repository.

It exists to publish a reviewed, documented, self-hostable baseline of the app without exposing internal churn or forcing the public repo to carry the full development history.

### `runsight-lite`

`runsight-lite` is the demo repository.

It is intentionally narrower than the full product:
- no-login default experience
- public demo data only
- demo-specific messaging and onboarding

## Working Rules

1. Product work starts in `runsight-web`.
2. Public releases are published into `runsight-core` as curated snapshots.
3. Demo-safe changes are published separately into `runsight-lite`.
4. `runsight-core` should stay public, clean, and distribution-focused.
5. Public bugs and documentation issues can be reported in `runsight-core` even if maintainers implement the fix in the primary development channel first.

## What Belongs In `runsight-core`

A normal public release should include:
- app UI and analytics logic
- Netlify functions and auth/session hardening
- Supabase schema and setup contract changes
- tests, CI, and public-facing docs
- security and deployment guidance

A normal public release should exclude:
- production environment values
- personal data
- site-specific URLs or secrets
- demo-only behavior that belongs in `runsight-lite`
- temporary or unvalidated experiments

## Release Flow

1. Build and validate changes in `runsight-web`.
2. Confirm the live setup, login, sync, and analytics flow there.
3. Prepare the reviewed public snapshot.
4. Publish that snapshot into `runsight-core` with a clean public history.
5. Update `runsight-lite` separately for demo-specific behavior.

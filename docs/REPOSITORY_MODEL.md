# RunSight Repository Model

This document defines how the active RunSight repositories are meant to work together.

## Roles

### `runsight-web`

`runsight-web` is the primary product repository.

It is the place where we:
- develop features and fixes
- validate the real product on Netlify
- maintain the live Supabase, auth, and setup contract
- track issues and release-readiness work in GitHub

If a change affects the real product, it starts here.

### `runsight-core`

`runsight-core` is the primary public distribution repository.

It exists to publish a reviewed, documented, releasable baseline of the app without turning the public repo into a second development stream.

It should receive curated syncs from `runsight-web` after:
- the code has been validated in `runsight-web`
- setup and deployment docs are accurate
- sensitive or instance-specific differences are excluded

### `runsight-lite`

`runsight-lite` is the demo repository.

It is intentionally narrower than the product:
- no login as the default experience
- public demo data only
- demo-specific messaging and onboarding

It should not grow independent product logic.

## Working Rules

1. All product development starts in `runsight-web`.
2. `runsight-core` receives reviewed downstream syncs from `runsight-web`.
3. `runsight-lite` only receives demo-safe changes.
4. We do not build features directly in `runsight-core` or `runsight-lite` unless the change is specific to distribution or demo behavior.
5. GitHub issues for active product work live in `runsight-web`.

## `web -> core` Sync Scope

A normal `runsight-web -> runsight-core` sync should include:
- app UI and UX improvements
- analytics logic and tests
- Netlify functions and auth/session hardening
- Supabase schema and setup contract changes
- deployment, troubleshooting, and security documentation

A normal sync should exclude:
- production environment values
- personal data
- site-specific URLs or secrets
- demo-only behavior that belongs in `runsight-lite`
- temporary experiments that have not been validated

## Release Flow

1. Build and validate in `runsight-web`.
2. Deploy `runsight-web` to Netlify and confirm the live setup/login/sync flow works.
3. Prepare the reviewed downstream subset for `runsight-core`.
4. Sync demo-safe behavior separately into `runsight-lite`.

This keeps one development source of truth without losing the public distribution and demo channels.

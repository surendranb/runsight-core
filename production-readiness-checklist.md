# RunSight Web Production Readiness Checklist

Last updated: 2026-03-08

## Purpose

This document is the human-readable release audit for `runsight-web`.

- Canonical product repo: `runsight-web`
- Downstream public repo: `runsight-core`
- Canonical GitHub tracker: [Issue #87](https://github.com/surendranb/runsight-web/issues/87) - `Production Readiness Audit: runsight-web`
- Release milestone: [v1 Production Readiness](https://github.com/surendranb/runsight-web/milestone/1)

The goal is to make RunSight usable by an average fitness enthusiast who already uses Strava and wants better analytics than the free plan, without turning setup or hosting into a project of its own.

## Product Frame

### Who this is for

An average fitness enthusiast who:

- already uses Strava
- wants better running analytics than the free Strava plan
- is comfortable cloning a repo and using hosted developer tools
- wants a lightweight, self-hosted app with a small operational footprint

### What the product promise is

RunSight should be:

- lightweight
- simple to deploy
- simple to configure
- secure by default
- useful immediately after first login and first sync

### Supported platform contract for v1

- Hosting: Netlify
- Storage: Supabase
- Data source: Strava
- Weather enrichment: OpenWeather
- AI: deferred and out of scope for v1

## Release Bar

For the first public release, "production ready" means:

1. a new user can follow the documented self-host setup flow without hidden steps
2. login with Strava works reliably
3. sync works reliably
4. dashboard, insights, year review, and supported advanced analytics work on real data
5. no open `P0` issues remain
6. manual signoff is completed on the live personal `runsight-web` instance

Local lint, type-check, and test cleanup are tracked and important, but they are not the primary release gate for v1 unless they block deploys or the real user journey.

## Supported User Journey

This is the setup flow the docs and product must support exactly:

1. Clone the repo.
2. Deploy the repo to Netlify.
3. Grab the Netlify site URL.
4. Create a Strava app using that URL and callback domain.
5. Create a Supabase project and apply the supported schema.
6. Enter the required secrets in Netlify.
7. Return to the app and log in with Strava.
8. Sync activities.
9. Access analytics.

Any hidden prerequisite, dashboard-only drift, undocumented SQL step, or env mismatch that breaks this flow is a release finding.

## Current Audited Baseline

### Live reference deployment

- Site: `runsight.surendranb.com`
- Netlify repo: `surendranb/runsight-web`
- Branch: `main`
- Current published deploy SHA: `d518fac1fbd69db28e17ff787f3ac3259603bb01`
- Latest Netlify validation status: pending next docs-only rebuild from `main`

### Current repo and runtime reality

The current audit shows that the product direction is coherent, but the implementation has drift in four important areas:

1. setup docs and repo config do not fully match the live deployment contract
2. Netlify dashboard build settings do not match `netlify.toml`
3. live Supabase schema is ahead of repo migrations and has security drift
4. the shipped runtime still contains deferred, placeholder, or dead surfaces

## Supported v1 Surface

### In scope for v1

- welcome/login flow
- Strava callback/setup flow
- sync flow
- dashboard
- insights
- year review
- advanced analytics that are backed by the supported data contract

### Out of scope for v1

- AI features
- placeholder pages
- production debug tooling
- unsupported database helpers and dormant integrations

## Findings

### P0 Release Blockers

#### [#76](https://github.com/surendranb/runsight-web/issues/76) `VITE_*` secret and env-contract drift

The code, docs, and live Netlify environment disagree about which variables are server-only. The final release must publish one clear env contract for self-hosters.

#### [#79](https://github.com/surendranb/runsight-web/issues/79) Setup flow and documentation do not yet match reality

The current docs still promise a simpler, cleaner path than the code and live runtime actually support. This directly blocks the public release because setup is a first-class product feature.

### P1 Must-Fix Soon

#### [#74](https://github.com/surendranb/runsight-web/issues/74) Browser-storage session and personal-data boundaries

Current browser storage is doing more than it should. The final v1 storage policy needs to be explicit and safer.

#### [#75](https://github.com/surendranb/runsight-web/issues/75) Production CORS and origin handling

Wildcard CORS remains too permissive for a product that is intended to be secure by default.

#### [#78](https://github.com/surendranb/runsight-web/issues/78) DebugConsole and unsafe diagnostics in production

Debug tooling is still shipped into the runtime surface and includes unsupported commands.

#### [#83](https://github.com/surendranb/runsight-web/issues/83) Deferred AI surface still exists in runtime and dependencies

AI is not part of the v1 contract and should not remain in the shipped runtime by default.

#### [#84](https://github.com/surendranb/runsight-web/issues/84) Dead runtime paths and nonexistent integrations

The product still carries runtime code that references missing endpoints or unsupported database objects.

#### [#86](https://github.com/surendranb/runsight-web/issues/86) Advanced analytics data-contract drift

Advanced analytics is part of the visible product surface, so its data paths must be reconciled with the live supported schema before public release.

### P2 Deferred Engineering Debt

#### [#85](https://github.com/surendranb/runsight-web/issues/85) Restore usable local quality gates

Lint, type-check, and tests need a cleaner baseline. This is important for maintainability but is not, by itself, the release gate for v1.

## Completed In This Audit Wave

- [#73](https://github.com/surendranb/runsight-web/issues/73): trusted caller handling moved to signed server-side sessions
- [#77](https://github.com/surendranb/runsight-web/issues/77): supported Supabase schema and private-table contract reconciled
- [#80](https://github.com/surendranb/runsight-web/issues/80): Netlify build command and publish directory aligned with repo
- [#81](https://github.com/surendranb/runsight-web/issues/81): callback flow normalized to `/auth/callback`
- [#82](https://github.com/surendranb/runsight-web/issues/82): placeholder and unreachable release surfaces removed

## Known Audit Evidence

### Live Netlify drift already confirmed

- Live build command uses `remix vite:build`
- Live publish directory uses `dist/client`
- Repo `netlify.toml` uses `npm run build`
- Repo `netlify.toml` publishes `dist`

### Live Supabase drift already confirmed

Live database includes:

- `runs`
- `user_tokens`
- `user_training_profiles`
- `daily_training_load`
- `goals`
- `public_activities_2025`

Audit findings already confirmed:

- `runs` and `user_tokens` are not yet represented cleanly by the checked-in migration story
- sensitive tables still need their final security posture defined and enforced
- repo code still references unsupported objects such as `user_training_load_summary` and `refresh_training_load_summary`

### Current code-health evidence already confirmed

- `npm run lint` currently fails because ESLint 9 expects a flat config and the repo does not provide one
- `tsc -p tsconfig.app.json --noEmit` currently reports a large error surface
- shipped runtime still includes `DebugConsole`, dormant AI code, and dead integration paths

## Validation Workflow

### What gets validated on every major fix batch

1. push changes to `runsight-web/main`
2. observe the resulting Netlify build and deploy
3. record the commit SHA and outcome in [Issue #87](https://github.com/surendranb/runsight-web/issues/87)
4. perform manual signoff on the live personal instance

### Manual signoff expectations

The personal instance must confirm:

- the docs match the actual setup steps
- Strava login works without callback confusion
- sync works on real data
- dashboard, insights, year review, and supported advanced analytics are usable
- deferred surfaces are removed, hidden, or clearly out of the shipped product

## `runsight-core` Sync Rule

Do not sync `runsight-web` into `runsight-core` until:

- all `P0` issues are closed
- the setup flow has been revalidated end to end
- the live personal instance has been signed off
- the public runtime surface has been narrowed to the supported v1 contract

At that point, open a dedicated `runsight-web -> runsight-core` sync issue and use `runsight-web` as the source of truth.

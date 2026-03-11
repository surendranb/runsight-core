# Contributing to RunSight Core

RunSight Core is the public distribution repository for RunSight.

That means this is the right place to:
- report public bugs
- suggest product improvements
- improve documentation
- propose small, reviewable code changes

It is not the primary day-to-day development repo. Maintainers validate and land changes in the primary development channel, then publish reviewed releases here.

## Before You Open a PR

1. Check existing issues first.
2. Open an issue before starting any non-trivial code change.
3. Keep proposals aligned with the product contract:
   - self-hosted
   - single-user deployment model
   - Netlify + Supabase + Strava stack
   - simple setup and secure defaults

## Local Setup

```bash
git clone https://github.com/YOUR_USERNAME/runsight-core.git
cd runsight-core
npm install
npm run setup
```

Useful checks:

```bash
npm run lint
npm run test:run
npm run build
```

## What Makes a Good Contribution

Strong contributions usually do one of these well:
- fix a real bug in setup, auth, sync, or analytics
- improve clarity in docs or UI copy
- tighten security or reduce deployment risk
- simplify code without changing the product contract

## What To Avoid

Please avoid PRs that:
- add unrelated product breadth
- assume a multi-tenant SaaS model
- require extra infrastructure beyond the supported stack
- bypass the documented setup and security model

## Review Expectations

Maintainers may choose to:
- discuss the change publicly here
- reimplement or adapt it in the primary development channel
- publish the reviewed result back to this repo as part of the next curated release

That workflow is intentional. It keeps the public repo clean and the release baseline coherent.

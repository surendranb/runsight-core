# RunSight Architecture

## Product Contract

RunSight Web is not a multi-tenant SaaS product.

Each deployment is owned by one user and runs on that user's:
- Netlify site
- Supabase project
- Strava app

The supported v1 stack is:
- Netlify for hosting and serverless functions
- Supabase for storage
- Strava for authentication and activity data
- OpenWeather for weather enrichment

The production app does not require any browser-side environment variables.
Secrets stay in Netlify function environment variables.

## Repository Model

RunSight is intentionally split into three roles:
- `runsight-web` is the primary development and production-validation repo
- `runsight-core` is the public distribution repo that receives curated syncs from `runsight-web`
- `runsight-lite` is the demo repo and should stay demo-specific and no-login

Working rules:
- all product work starts in `runsight-web`
- `runsight-core` does not grow product logic independently
- `runsight-lite` only carries demo-specific differences
- syncs from `runsight-web` downstream are deliberate and documented

## Security Model

- browser code does not talk directly to private Supabase tables
- Netlify functions use the Supabase service role
- the app uses a signed HTTP-only session cookie after Strava login
- sensitive runtime config stays in Netlify environment variables

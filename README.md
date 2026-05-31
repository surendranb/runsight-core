# RunSight Web

RunSight Web is a self-hosted Strava analytics app for runners who want deeper insight than the free Strava plan provides.

The target user is simple:
- already uses Strava
- wants better analytics
- can deploy a small app once on Netlify
- wants to keep full control of code, hosting, and data

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

The detailed repo contract is in [`docs/REPOSITORY_MODEL.md`](docs/REPOSITORY_MODEL.md).

## What You Get

Current release surfaces:
- dashboard
- insights
- year in review
- advanced analytics
- setup/login flow
- Strava sync flow

Not part of the required v1 setup flow:
- AI features
- demo-specific behavior
- placeholder pages

## Quick Start

1. Fork or clone this repository.
2. Create a Supabase project and run the SQL files in `supabase/migrations/` in filename order.
3. Import the repo into Netlify with:
   - build command: `npm run build`
   - publish directory: `dist`
4. Let Netlify deploy once so you get your final site URL.
5. Create or update your Strava app using that Netlify URL.
6. Add the required environment variables in Netlify.
7. Trigger a new deploy.
8. Open the site, connect Strava, and run your first sync.

The full setup guide is in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Required Netlify Environment Variables

```bash
STRAVA_CLIENT_ID=your_strava_client_id
STRAVA_CLIENT_SECRET=your_strava_client_secret
STRAVA_REDIRECT_URI=https://your-site.netlify.app/auth/callback
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
OPENWEATHER_API_KEY=your_openweather_api_key
```

Recommended:

```bash
SESSION_SECRET=long_random_string
```

Notes:
- `STRAVA_REDIRECT_URI` must end with `/auth/callback`
- the Strava app callback domain must match your Netlify domain exactly
- the app does not require `VITE_*` env vars for production

## Local Development

```bash
npm install
npm run dev
```

Useful commands:

```bash
npm run build
npm run check-env
npm run setup
```

## Deployment Notes

The intended user journey is:
1. clone the repo
2. deploy to Netlify
3. grab the final URL
4. configure Strava with that URL
5. add Netlify secrets
6. log in and sync runs

That flow is documented in detail in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) and troubleshooting is in [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md).

## Security Model

- browser code does not talk directly to private Supabase tables
- Netlify functions use the Supabase service role
- the app uses a signed HTTP-only session cookie after Strava login
- sensitive runtime config stays in Netlify environment variables

## License

RunSight Web is distributed under the PolyForm Noncommercial 1.0.0 license.

That means:
- you can use, study, modify, and self-host the code for noncommercial purposes
- you cannot sell the code or derivative commercial offerings under this license
- this repository is source-available, not OSI open source

See [`LICENSE`](LICENSE) for the full terms.

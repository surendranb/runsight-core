# RunSight Core

[![Quality](https://github.com/surendranb/runsight-core/actions/workflows/quality.yml/badge.svg)](https://github.com/surendranb/runsight-core/actions/workflows/quality.yml)
![License: PolyForm Noncommercial](https://img.shields.io/badge/license-PolyForm%20Noncommercial-blue)

RunSight Core is the public, self-hostable release of RunSight: a Strava analytics app for runners who want more signal than the free Strava plan gives them.

It is built for one person to run on their own stack:
- Netlify for hosting and serverless functions
- Supabase for storage
- Strava for auth and activity data
- OpenWeather for weather enrichment

Your data stays in your own deployment. There is no shared SaaS backend.

## What You Get

RunSight Core ships the full self-hosted analytics experience:
- `Overview`: current status, recent change, and what needs attention next
- `Insights`: patterns in pace, training, and environment
- `Year Review`: retrospective storytelling over a full season or year
- `Advanced`: deeper diagnostics like training load, pacing, predictions, and physiology-backed analysis
- secure setup, login, and Strava sync flow

## Step-By-Step Setup

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/runsight-core.git
cd runsight-core
npm install
```

Optional local checks:

```bash
npm run lint
npm run test:run
npm run build
```

### 2. Create a Supabase project

1. Create a new Supabase project.
2. Open the SQL Editor.
3. Run the SQL files in `supabase/migrations/` in filename order.
4. Copy these values from Supabase:
   - `Project URL`
   - `Service role key`

A healthy install should include these private tables:
- `runs`
- `user_tokens`
- `user_training_profiles`

### 3. Import the repo into Netlify

In Netlify, import your GitHub repo with these settings:
- Build command: `npm run build`
- Publish directory: `dist`
- Node version: `18`

Deploy once before adding Strava credentials. You need the final site URL first.

### 4. Grab the final Netlify URL

After the first deploy, note your final site URL, for example:

```text
https://your-site-name.netlify.app
```

You will use this exact domain in both Strava and Netlify configuration.

### 5. Create or update your Strava app

Go to [developers.strava.com](https://developers.strava.com) and create or update your app.

Use:
- Website: `https://your-site-name.netlify.app`
- Authorization Callback Domain: `your-site-name.netlify.app`

Then copy:
- `Client ID`
- `Client Secret`

Important:
- the callback domain is the domain only, without `https://`
- the Netlify env var uses the full callback URL with `/auth/callback`

### 6. Add the Netlify environment variables

```bash
STRAVA_CLIENT_ID=your_strava_client_id
STRAVA_CLIENT_SECRET=your_strava_client_secret
STRAVA_REDIRECT_URI=https://your-site-name.netlify.app/auth/callback
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
OPENWEATHER_API_KEY=your_openweather_api_key
SESSION_SECRET=long_random_string
```

Notes:
- `STRAVA_REDIRECT_URI` must end with `/auth/callback`
- the app does not require any `VITE_*` variables for production
- `SESSION_SECRET` is strongly recommended

### 7. Trigger a fresh deploy

After adding the environment variables:
1. trigger a new Netlify deploy
2. wait for it to finish
3. open the live site

### 8. Log in and sync your data

The supported first-run flow is:
1. open the site
2. click `Connect with Strava`
3. complete Strava OAuth
4. return to `/auth/callback`
5. land on the dashboard
6. run a sync
7. verify your analytics load

If login succeeds but you are redirected to the wrong URL, your Strava callback configuration is still wrong.

## Repository Model

RunSight uses three repository roles:
- `runsight-web`: the primary development and production-validation channel
- `runsight-core`: this public distribution channel
- `runsight-lite`: the demo channel

This repo is intentionally clean and public-facing. Curated releases are published here after they have already been validated in the primary development channel.

The detailed repo contract is in [`docs/REPOSITORY_MODEL.md`](docs/REPOSITORY_MODEL.md).

## Local Development

```bash
npm run dev
```

Useful commands:

```bash
npm run lint
npm run test:run
npm run build
npm run check-env
npm run setup
```

## Security Model

- browser code does not talk directly to private Supabase tables
- Netlify functions use the Supabase service role server-side
- the app uses signed HTTP-only sessions after Strava login
- production secrets stay in Netlify environment variables

## More Documentation

- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
- [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md)
- [`SECURITY.md`](SECURITY.md)
- [`CONTRIBUTING.md`](CONTRIBUTING.md)

## License

RunSight Core is distributed under the PolyForm Noncommercial 1.0.0 license.

That means:
- you can use, study, modify, and self-host the code for noncommercial purposes
- you cannot sell the code or derivative commercial offerings under this license
- this repository is source-available, not OSI open source

See [`LICENSE`](LICENSE) for the full terms.

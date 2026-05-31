# RunSight Web Deployment Guide

This guide documents the supported v1 deployment flow for a self-hosted RunSight Web instance.

The intended setup is:
- one user
- one Netlify site
- one Supabase project
- one Strava app

## Prerequisites

You need:
- a GitHub account
- a Netlify account
- a Supabase account
- a Strava account
- an OpenWeather account
- Node.js 18+

## Step 1: Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/runsight-web.git
cd runsight-web
npm install
```

Optional local checks:

```bash
npm run build
npm run check-env
npm run setup
```

## Step 2: Create Supabase and Run Migrations

1. Create a new Supabase project.
2. Open the SQL Editor.
3. Run every SQL file in `supabase/migrations/` in filename order.

At minimum, a working install should end up with these private tables:
- `runs`
- `user_tokens`
- `user_training_profiles`

And this demo/public view may also exist:
- `public_activities_2025`

Then copy these values from Supabase:
- `Project URL`
- `Service role key`

RunSight Web does not require direct browser access to private Supabase tables.

## Step 3: Import the Repo into Netlify

1. In Netlify, import your GitHub repo.
2. Use these build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: `18`
3. Deploy once before adding auth credentials.

This first deploy is intentional. You need the final site URL before configuring Strava correctly.

## Step 4: Get the Final Netlify URL

After the first deploy, note your final site URL, for example:

```text
https://your-site-name.netlify.app
```

You will use this exact domain in both Netlify env vars and the Strava app settings.

## Step 5: Create or Update the Strava App

Go to [developers.strava.com](https://developers.strava.com) and create or update your app.

Use:
- Website: `https://your-site-name.netlify.app`
- Authorization Callback Domain: `your-site-name.netlify.app`

Then copy:
- `Client ID`
- `Client Secret`

Important:
- the callback domain must be the domain only, without `https://`
- your Netlify env var must use the full URL with `/auth/callback`

## Step 6: Add Netlify Environment Variables

In Netlify, add these environment variables:

```bash
STRAVA_CLIENT_ID=your_strava_client_id
STRAVA_CLIENT_SECRET=your_strava_client_secret
STRAVA_REDIRECT_URI=https://your-site-name.netlify.app/auth/callback
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
OPENWEATHER_API_KEY=your_openweather_api_key
```

Recommended:

```bash
SESSION_SECRET=long_random_random_string
```

Notes:
- `STRAVA_REDIRECT_URI` must end with `/auth/callback`
- production does not require any `VITE_*` env vars
- `SESSION_SECRET` is recommended for session signing; if omitted, the app falls back to `SUPABASE_SERVICE_KEY`

## Step 7: Trigger a Fresh Deploy

After adding env vars:
1. trigger a new Netlify deploy
2. wait for it to finish successfully
3. open the live site

## Step 8: Validate the User Journey

The supported validation flow is:
1. open the site
2. click `Connect with Strava`
3. complete Strava OAuth
4. return to `/auth/callback`
5. land on the dashboard
6. run a sync
7. verify analytics load

If login succeeds but you are redirected to the wrong URL, your Strava app callback configuration is still wrong.

## Expected Production Behavior

A healthy deployment should have:
- successful homepage load
- successful Strava login
- successful callback to `/auth/callback`
- successful sync for a small time range
- dashboard, insights, year review, and advanced views loading on real data

## What Is Not Required for v1

These are not required parts of the production setup contract:
- AI configuration
- browser-side Supabase env vars
- demo-mode setup
- placeholder pages

## Common Failure Modes

1. Netlify deploy succeeds, but login fails.
   - Check `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, and the Strava app callback domain.

2. Login starts, but Strava redirects to the wrong URL.
   - Check both:
     - Strava app callback domain
     - `STRAVA_REDIRECT_URI`
   - They must point to the same deployed site.

3. Login works, but dashboard is empty.
   - Run a sync.
   - Confirm `user_tokens` and `runs` exist in Supabase.

4. Sync fails immediately.
   - Check `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `STRAVA_CLIENT_SECRET`, and Netlify function logs.

For more detailed fixes, see [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md).

# RunSight Web Troubleshooting

This guide focuses on the supported self-hosted production flow.

## Quick Checks

Before debugging deeper, confirm:
- the latest Netlify deploy succeeded
- the site URL opens normally
- the Strava app callback domain matches the Netlify domain exactly
- `STRAVA_REDIRECT_URI` ends with `/auth/callback`
- Supabase migrations were run in filename order
- all required Netlify env vars are present

## Login Fails Before Redirecting to Strava

Likely causes:
- `STRAVA_CLIENT_ID` missing
- `STRAVA_CLIENT_SECRET` missing
- `auth-strava` function not deployed correctly

Checks:
- inspect Netlify function logs
- confirm the latest deploy used the current env vars

## Strava Redirects Back to the Wrong URL

This is one of the most common setup failures.

You must align both of these:
- Strava app `Authorization Callback Domain`: `your-site-name.netlify.app`
- Netlify `STRAVA_REDIRECT_URI`: `https://your-site-name.netlify.app/auth/callback`

If either one still points at an old domain, the login flow will break even if the app code is correct.

## Returned from Strava but the App Crashes

Check:
- the deployed site is reachable at `/auth/callback`
- the Strava app still is not pointing to an older URL
- Netlify has the correct `STRAVA_REDIRECT_URI`

A working callback path for v1 is only:

```text
/auth/callback
```

## Dashboard Does Not Load After Login

Likely causes:
- `SUPABASE_URL` is wrong
- `SUPABASE_SERVICE_KEY` is wrong
- Supabase migrations were incomplete
- `user_tokens` was not written during auth

Checks:
- verify `user_tokens` exists in Supabase
- verify a row was created for your Strava user
- inspect Netlify function logs for `auth-strava` and `get-runs`

## Sync Fails

Likely causes:
- expired or invalid Strava tokens
- incorrect `STRAVA_CLIENT_SECRET`
- bad `SUPABASE_SERVICE_KEY`
- OpenWeather quota or activation delay

Checks:
- log out and log back in
- try syncing a smaller date range first
- inspect `sync-data` logs in Netlify

## No Weather Data

Checks:
- confirm `OPENWEATHER_API_KEY` is set
- wait for a newly created OpenWeather key to activate
- retry with a smaller sync window

The app can still function without weather enrichment. Weather issues should not block the base analytics flow.

## Session Problems

If you are logged out unexpectedly:
- confirm Netlify has `SESSION_SECRET` set
- if not, the app falls back to `SUPABASE_SERVICE_KEY`
- after changing either value, log in again to refresh the session cookie

## Build Succeeds but Production Is Still Wrong

Check for hidden config drift:
- old Strava callback domain in the Strava developer portal
- stale Netlify env values
- repo docs not matching the deployed site URL you actually use

When in doubt:
1. confirm the live Netlify URL
2. update the Strava app to that exact domain
3. update `STRAVA_REDIRECT_URI`
4. trigger a fresh deploy
5. run the login flow again

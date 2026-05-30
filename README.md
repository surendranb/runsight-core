# RunSight Core

[![Quality](https://github.com/surendranb/runsight-core/actions/workflows/quality.yml/badge.svg)](https://github.com/surendranb/runsight-core/actions/workflows/quality.yml)
![License: PolyForm Noncommercial](https://img.shields.io/badge/license-PolyForm%20Noncommercial-blue)

RunSight Core is the public, self-hostable release of RunSight: a Strava analytics app for runners who want more signal than the free Strava plan gives them.

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/surendranb/runsight-core)

It is built for one person to run on their own stack:
- **Netlify** for hosting and serverless functions
- **Supabase** for secure storage
- **Strava** for authentication and activity data

Your data stays in your own deployment. There is no shared SaaS backend.

## What You Get

RunSight Core ships the full self-hosted analytics experience:
- **Overview**: Current status, recent changes, and what needs attention next.
- **Insights**: Patterns in pace, training, and environment.
- **Year Review**: Retrospective storytelling over a full season or year.
- **Advanced**: Deeper diagnostics like training load, pacing, predictions, and physiology-backed analysis.
- **AI Coach**: Personalized coaching insights powered by Google Gemini (Optional).

---

## ⚡️ One-Click Deploy Setup

Follow these exact steps to get your own instance running in minutes.

### 1. Database Setup (Supabase)
1. Go to [Supabase](https://supabase.com/) and create a new project.
2. In your new project, open the **SQL Editor**.
3. Copy the contents of `supabase/migrations/20250609100000_fresh_start_simple_schema.sql` (from this repository) and run it.
4. Run `supabase/migrations/20250609110000_add_proper_rls_security.sql`.
5. Go to **Project Settings -> API** and copy:
   - `Project URL`
   - `Service Role Key` (Keep this secret!)

### 2. Strava API Setup
1. Go to [Strava API Settings](https://www.strava.com/settings/api).
2. Create an application (or update an existing one).
3. Set **Authorization Callback Domain** to `your-site-name.netlify.app` (You can update this after Netlify creates your site name).
4. Copy the `Client ID` and `Client Secret`.

### 3. Deploy to Netlify
1. Click the **Deploy to Netlify** button at the top of this README.
2. Connect your GitHub account and authorize Netlify.
3. During setup, Netlify will prompt you for Environment Variables. Fill them in:
   - `STRAVA_CLIENT_ID`: (from Step 2)
   - `STRAVA_CLIENT_SECRET`: (from Step 2)
   - `STRAVA_REDIRECT_URI`: `https://your-site-name.netlify.app/auth/callback` (Make sure to update this with your actual Netlify URL once deployed)
   - `SUPABASE_URL`: (from Step 1)
   - `SUPABASE_SERVICE_KEY`: (from Step 1)
   - `SESSION_SECRET`: (A long, random string, e.g., generated via a password manager)
   - `GEMINI_API_KEY`: (Optional, for AI Coaching features)

4. Click **Save & Deploy**.

### 4. Final Verification
1. Once deployed, note your final Netlify URL (e.g. `https://my-runsight-clone.netlify.app`).
2. Go back to Strava and ensure the **Authorization Callback Domain** exactly matches your Netlify domain (`my-runsight-clone.netlify.app`).
3. Update your `STRAVA_REDIRECT_URI` environment variable in Netlify Site Settings to match the final URL.
4. Open your site, click **Connect with Strava**, and start analyzing your runs!

---

## Repository Model

RunSight uses three repository roles:
- `runsight-web`: the primary development and production-validation channel
- `runsight-core`: this public distribution channel
- `runsight-lite`: the demo channel

This repo is intentionally clean and public-facing. Curated releases are published here after they have already been validated in the primary development channel.
The detailed repo contract is in [`docs/REPOSITORY_MODEL.md`](docs/REPOSITORY_MODEL.md).

## Local Development

To run this locally, clone the repo and run:
```bash
npm install
npm run dev
```

Useful commands:
```bash
npm run lint
npm run test:run
npm run build
npm run check-env
```

## Security Model
- Browser code does not talk directly to private Supabase tables.
- Netlify functions use the Supabase service role server-side.
- The app uses signed HTTP-only sessions after Strava login.
- Production secrets stay safely in Netlify environment variables.

## License

RunSight Core is distributed under the PolyForm Noncommercial 1.0.0 license.
See [`LICENSE`](LICENSE) for the full terms.

# 🆘 RunSight Web: Emergency Recovery Guide

If the application is still broken after the restoration push, follow these steps to revert or debug.

## 1. Quick Revert (Back to "Broken but Stable" State)
If you need to instantly undo everything I just did and go back to exactly where you were at the start of this chat:

```bash
# 1. Reset your local branch to the state I found it in
git reset --hard 59a4041

# 2. Force push this old state back to GitHub
git push origin main --force
```

## 2. Verification Checklist
After the push, verify these three points in the [Netlify Dashboard](https://app.netlify.com/):
1. **Deploys:** Ensure the latest deploy shows a green "Published" badge.
2. **Functions:** Check the `auth-strava` function logs. You should NOT see `DB_INSERT_ERROR`.
3. **Environment:** Ensure `SUPABASE_SERVICE_KEY` is set in the Netlify UI (not `VITE_` prefixed).

## 3. Key Files Changed in this Restoration
- `netlify.toml`: Removed broken `Content-Security-Policy`.
- `netlify/functions/auth-strava.js`: Switched to `upsert` logic for database resilience.
- `netlify/functions/get-runs.js`: Added fallback environment variable lookups.

## 4. Troubleshooting the "DB_INSERT_ERROR"
If you still see this error in the logs:
1. It means the `user_tokens` table in Supabase is missing columns or has a constraint violation.
2. Check the Supabase **Database > Tables > user_tokens** section.
3. Ensure columns `strava_user_id`, `strava_access_token`, `strava_refresh_token`, and `user_name` exist.

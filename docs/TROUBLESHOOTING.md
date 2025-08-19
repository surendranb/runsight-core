# 🔧 RunSight Web - Troubleshooting Guide

This guide covers common issues and their solutions when deploying and running RunSight Web.

## 🚨 Quick Diagnostic Checklist

Before diving into specific issues, run through this quick checklist:

- [ ] All environment variables are set in Netlify dashboard
- [ ] Strava callback domain matches your Netlify domain exactly
- [ ] Supabase migrations have been run successfully
- [ ] OpenWeatherMap API key is activated (can take 10-60 minutes)
- [ ] Latest deployment was successful in Netlify

---

## 🔐 Authentication Issues

### Issue: "Failed to get authorization URL"
**Symptoms:** 
- Can't click "Connect with Strava" button
- Error message about authorization URL

**Causes & Solutions:**
1. **Missing Strava credentials**
   ```bash
   # Check these are set in Netlify:
   STRAVA_CLIENT_ID=your_client_id
   STRAVA_CLIENT_SECRET=your_client_secret
   ```

2. **Netlify function not deployed**
   - Go to Netlify dashboard → Functions
   - Verify `auth-strava` function exists
   - Check function logs for errors

**How to fix:**
1. Verify environment variables in Netlify dashboard
2. Redeploy site after adding missing variables
3. Check Netlify function logs for detailed errors

### Issue: "Authentication failed" or "Token exchange failed"
**Symptoms:**
- Redirected back from Strava but shows error
- Stuck on authentication screen

**Causes & Solutions:**
1. **Callback domain mismatch**
   - Strava app callback domain: `your-app.netlify.app`
   - Netlify site domain: `your-app.netlify.app`
   - These must match exactly (no `https://` in Strava settings)

2. **Incorrect redirect URI**
   ```bash
   # Should be set in Netlify:
   STRAVA_REDIRECT_URI=https://your-app.netlify.app/auth/callback
   ```

**How to fix:**
1. Go to [developers.strava.com](https://developers.strava.com)
2. Edit your application
3. Set **Authorization Callback Domain** to just your domain (e.g., `amazing-app-123.netlify.app`)
4. Update `STRAVA_REDIRECT_URI` in Netlify to include full URL with `/auth/callback`
5. Redeploy site

### Issue: "Your session has expired"
**Symptoms:**
- Was working before, now shows authentication error
- Need to reconnect frequently

**Causes & Solutions:**
1. **Strava token expired** (normal after 6 hours)
   - This is expected behavior
   - Token refresh should happen automatically

2. **Token refresh failing**
   - Check Netlify function logs for refresh errors
   - Verify `STRAVA_CLIENT_SECRET` is correct

**How to fix:**
1. Try logging out and reconnecting
2. Check function logs for token refresh errors
3. Verify all Strava credentials are correct

---

## 🗄️ Database Issues

### Issue: "Database connection failed" or "RLS policy violation"
**Symptoms:**
- Can authenticate but can't load dashboard
- Error about database permissions

**Causes & Solutions:**
1. **Missing Supabase credentials**
   ```bash
   # Check these are set in Netlify:
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=eyJ... (long string)
   ```

2. **Migrations not run**
   - Tables don't exist
   - RLS policies not set up

**How to fix:**
1. Verify Supabase credentials in Netlify dashboard
2. Run all migrations in order in Supabase SQL Editor:
   ```
   1. 20250609100000_fresh_start_simple_schema.sql
   2. 20250609110000_add_proper_rls_security.sql
   3. 20250610200000_add_geocoding_columns.sql
   4. 20250717000000_create_goals_table.sql
   ```
3. Verify tables exist in Supabase dashboard
4. Redeploy site

### Issue: "User not found" or "No data available"
**Symptoms:**
- Can authenticate but no runs appear
- Dashboard shows empty state

**Causes & Solutions:**
1. **No data synced yet**
   - Need to run initial sync
   - Click "Sync Data" in dashboard

2. **RLS policies blocking access**
   - User can't access their own data
   - Check RLS policies in Supabase

**How to fix:**
1. Try syncing data first
2. Check Supabase Auth users to verify user exists
3. Verify RLS policies allow user access to their data

---

## 🔄 Data Sync Issues

### Issue: "Sync failed" or "Failed to fetch activities"
**Symptoms:**
- Sync starts but fails partway through
- Error messages during sync process

**Causes & Solutions:**
1. **Strava API rate limiting**
   - Too many requests too quickly
   - Normal for large datasets

2. **Network timeouts**
   - Large sync operations timing out
   - Netlify function timeout (10 seconds max)

**How to fix:**
1. Try syncing smaller time periods (e.g., "Last 7 days")
2. Wait 15 minutes between sync attempts
3. For large datasets, sync in smaller chunks

### Issue: "Some activities failed to sync"
**Symptoms:**
- Partial sync success
- Some runs missing from dashboard

**Causes & Solutions:**
1. **Data validation errors**
   - Some Strava activities have invalid data
   - GPS errors or missing required fields

2. **API inconsistencies**
   - Strava API returning malformed data
   - Network issues during sync

**How to fix:**
1. This is often normal - some activities have data issues
2. Try syncing again to catch missed activities
3. Check Netlify function logs for specific errors

---

## 🌤️ Weather Data Issues

### Issue: "No weather data" or weather icons missing
**Symptoms:**
- Runs sync successfully but no weather information
- Weather section shows "No data available"

**Causes & Solutions:**
1. **API key not activated**
   - OpenWeatherMap keys take 10-60 minutes to activate
   - Free tier has limited historical data

2. **Missing API key**
   ```bash
   # Check this is set in Netlify:
   OPENWEATHER_API_KEY=your_api_key
   ```

3. **Free tier limitations**
   - Free tier only has current weather
   - Historical weather requires paid plan ($40/month)

**How to fix:**
1. Wait 1 hour after creating OpenWeatherMap account
2. Test API key: `api.openweathermap.org/data/2.5/weather?q=London&appid=YOUR_KEY`
3. For full historical weather, upgrade to paid plan
4. Check Netlify function logs for weather API errors

### Issue: "Weather API quota exceeded"
**Symptoms:**
- Weather worked before, now shows errors
- Error about daily limits

**Causes & Solutions:**
1. **Free tier daily limit reached** (1000 calls/day)
2. **Too many sync operations**

**How to fix:**
1. Wait until next day for quota reset
2. Upgrade to paid OpenWeatherMap plan
3. Reduce sync frequency

---

## 🚀 Deployment Issues

### Issue: "Build failed" during Netlify deployment
**Symptoms:**
- Deployment fails in Netlify
- Build logs show errors

**Common Build Errors:**
1. **Node version mismatch**
   ```bash
   # Set in netlify.toml:
   [build.environment]
   NODE_VERSION = "18"
   ```

2. **Missing dependencies**
   ```bash
   # Run locally to check:
   npm install
   npm run build
   ```

3. **Environment variable issues**
   - Build trying to access missing variables
   - Check build logs for specific missing vars

**How to fix:**
1. Check build logs for specific error messages
2. Verify Node version is set to 18
3. Test build locally: `npm run build`
4. Ensure all required environment variables are set

### Issue: "Functions not working" or 404 errors on API calls
**Symptoms:**
- Site loads but API calls fail
- 404 errors on `/.netlify/functions/*` endpoints

**Causes & Solutions:**
1. **Functions not deployed**
   - Check Netlify dashboard → Functions
   - Should see: `auth-strava`, `get-runs`, `sync-data`

2. **Function build errors**
   - Check function logs for errors
   - Verify function code is correct

**How to fix:**
1. Verify functions appear in Netlify dashboard
2. Check function logs for errors
3. Redeploy site to rebuild functions

---

## 📊 Performance Issues

### Issue: "Site loads slowly" or timeouts
**Symptoms:**
- Long loading times
- Timeouts during data loading

**Causes & Solutions:**
1. **Large datasets**
   - Too many runs to load at once
   - Database queries taking too long

2. **Network issues**
   - Slow connection to Supabase
   - API rate limiting

**How to fix:**
1. Sync smaller time periods initially
2. Check Supabase query performance
3. Monitor Netlify function execution times

### Issue: "Sync takes too long" or times out
**Symptoms:**
- Sync process hangs
- Timeout errors during sync

**Causes & Solutions:**
1. **Netlify function timeout** (10 seconds max)
2. **Large number of activities**
3. **Weather API rate limiting**

**How to fix:**
1. Sync smaller time periods (e.g., 30 days at a time)
2. Wait between sync operations
3. Check function logs for timeout errors

---

## 🔍 Debugging Tools

### Netlify Dashboard
1. **Site Overview:** Deployment status and errors
2. **Functions:** Function logs and performance
3. **Deploy Logs:** Build process errors

### Supabase Dashboard
1. **Database:** Table data and query performance
2. **Auth:** User authentication status
3. **Logs:** Database query logs and errors

### Browser Developer Tools
1. **Console:** JavaScript errors and API responses
2. **Network:** Failed API requests and response codes
3. **Application:** Local storage and session data

### Useful Log Locations
```bash
# Netlify function logs
Netlify Dashboard → Functions → [function-name] → Logs

# Supabase logs  
Supabase Dashboard → Logs → [filter by service]

# Browser console
F12 → Console tab
```

---

## 🆘 Getting Help

### Before Asking for Help
1. **Check the logs** (Netlify functions, browser console, Supabase)
2. **Try the solutions** in this troubleshooting guide
3. **Search existing issues** on GitHub

### Where to Get Help
1. **GitHub Issues:** [Report bugs and technical issues](https://github.com/surendranb/runsight-web/issues)
2. **GitHub Discussions:** [Ask questions and get community help](https://github.com/surendranb/runsight-web/discussions)
3. **Documentation:** Check README.md and docs/ folder

### When Reporting Issues
Include this information:
- **Error message** (exact text)
- **Steps to reproduce** the issue
- **Browser and version** you're using
- **Netlify function logs** (if relevant)
- **Environment:** Self-hosted or using provided deployment

### Emergency Recovery
If your deployment is completely broken:
1. **Redeploy from scratch:** Delete Netlify site and redeploy
2. **Reset database:** Drop and recreate Supabase tables
3. **Start fresh:** Fork the repository again and follow deployment guide

---

## 📈 Monitoring and Maintenance

### Regular Maintenance Tasks
- **Monthly:** Check for dependency updates
- **Quarterly:** Rotate API keys for security
- **As needed:** Monitor function performance and costs

### Health Check Indicators
- ✅ Authentication works (can connect to Strava)
- ✅ Data sync works (runs appear in dashboard)
- ✅ Weather data loads (icons appear on runs)
- ✅ No errors in function logs
- ✅ Database queries perform well

### Performance Monitoring
- Monitor Netlify function execution times
- Check Supabase database performance
- Track API usage against quotas

---

**Remember:** Most issues are related to configuration (environment variables, API keys, or callback URLs). Double-check these first before diving into complex debugging!
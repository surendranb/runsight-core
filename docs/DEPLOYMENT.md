# 🚀 RunSight Web - Production Deployment Guide

This guide will walk you through deploying RunSight Web to production using Netlify + Supabase. **Estimated time: 30-45 minutes**.

## 📋 Prerequisites

Before you begin, make sure you have:
- [ ] A GitHub account
- [ ] A Netlify account (free tier works)
- [ ] A Supabase account (free tier works)
- [ ] A Strava account for testing
- [ ] An OpenWeatherMap account (free tier works)

## 🏗️ Architecture Overview

RunSight Web uses a **serverless architecture** with zero frontend credential exposure:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React App     │    │ Netlify Functions│    │   Supabase DB   │
│   (Frontend)    │───▶│   (Backend)      │───▶│  (PostgreSQL)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │
         │                       ▼
         │              ┌──────────────────┐
         │              │  External APIs   │
         └──────────────│  • Strava        │
                        │  • OpenWeather   │
                        └──────────────────┘
```

**Security Features:**
- ✅ All API keys stored server-side only
- ✅ Row Level Security (RLS) for user data isolation
- ✅ OAuth authentication with Strava
- ✅ No credentials exposed to browser

---

## 🎯 Step 1: Fork and Clone Repository

### 1.1 Fork the Repository
1. Go to [RunSight Web GitHub Repository](https://github.com/surendranb/runsight-web)
2. Click **"Fork"** in the top right
3. Choose your GitHub account

### 1.2 Clone Your Fork
```bash
git clone https://github.com/YOUR_USERNAME/runsight-web.git
cd runsight-web
npm install
```

**✅ Success Check:** You should see `node_modules` folder created and no errors.

---

## 🗄️ Step 2: Set Up Supabase Database

### 2.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Click **"New Project"**
3. Choose your organization
4. Fill in project details:
   - **Name:** `runsight-web` (or your preferred name)
   - **Database Password:** Generate a strong password (save it!)
   - **Region:** Choose closest to your users
5. Click **"Create new project"**
6. Wait 2-3 minutes for setup to complete

### 2.2 Run Database Migrations
1. In your Supabase dashboard, go to **SQL Editor**
2. Run each migration file in order (copy/paste content):

**Migration Order:**
```
1. 20250609100000_fresh_start_simple_schema.sql
2. 20250609110000_add_proper_rls_security.sql  
3. 20250610200000_add_geocoding_columns.sql
4. 20250717000000_create_goals_table.sql
```

3. For each file:
   - Open `supabase/migrations/[filename].sql` in your code editor
   - Copy the entire content
   - Paste into Supabase SQL Editor
   - Click **"Run"**
   - Verify no errors

### 2.3 Get Supabase Credentials
1. Go to **Settings** → **API**
2. Copy these values (you'll need them later):
   - **Project URL** (looks like: `https://abcdefgh.supabase.co`)
   - **Service Role Key** (starts with `eyJ...` - this is secret!)

**✅ Success Check:** You should see tables `runs`, `user_tokens`, and `goals` in your Database tab.

---

## 🏃‍♂️ Step 3: Set Up Strava API

### 3.1 Create Strava Application
1. Go to [developers.strava.com](https://developers.strava.com)
2. Click **"Create App"**
3. Fill in the form:
   - **Application Name:** `RunSight Web` (or your preferred name)
   - **Category:** `Data Importer`
   - **Club:** Leave blank
   - **Website:** `https://your-app-name.netlify.app` (you'll update this later)
   - **Authorization Callback Domain:** `your-app-name.netlify.app`
   - **Description:** `Personal running analytics dashboard`
4. Click **"Create"**

### 3.2 Get Strava Credentials
After creating the app, copy these values:
- **Client ID** (6-digit number)
- **Client Secret** (long string - this is secret!)

**⚠️ Important:** You'll update the callback domain after deploying to Netlify.

**✅ Success Check:** You should see your app listed in your Strava API Applications.

---

## 🌤️ Step 4: Set Up OpenWeatherMap API

### 4.1 Create OpenWeatherMap Account
1. Go to [openweathermap.org/api](https://openweathermap.org/api)
2. Click **"Sign Up"** (free tier is sufficient)
3. Verify your email

### 4.2 Get API Key
1. Go to **API Keys** tab in your account
2. Copy the **API Key** (you might need to wait a few minutes for activation)

### 4.3 (Optional) Upgrade for Historical Weather
- **Free Tier:** Current weather only (limited historical data)
- **Paid Tier ($40/month):** Full historical weather data for all runs

**For testing:** Free tier is fine. You can upgrade later if needed.

**✅ Success Check:** Your API key should be active (test at `api.openweathermap.org/data/2.5/weather?q=London&appid=YOUR_API_KEY`).

---

## 🚀 Step 5: Deploy to Netlify

### 5.1 Connect Repository to Netlify
1. Go to [netlify.com](https://netlify.com)
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **GitHub** and authorize Netlify
4. Select your forked `runsight-web` repository
5. Configure build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Node version:** `18`
6. Click **"Deploy site"**

### 5.2 Configure Environment Variables
1. In your Netlify site dashboard, go to **Site settings** → **Environment variables**
2. Add these variables (click **"Add variable"** for each):

```bash
# Strava API Configuration
STRAVA_CLIENT_ID=your_strava_client_id
STRAVA_CLIENT_SECRET=your_strava_client_secret
STRAVA_REDIRECT_URI=https://your-site-name.netlify.app/auth/callback

# Supabase Configuration  
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# OpenWeatherMap API
OPENWEATHER_API_KEY=your_openweather_api_key
```

**⚠️ Important:** Replace `your-site-name` with your actual Netlify site name.

### 5.3 Update Strava Callback URL
1. Go back to [developers.strava.com](https://developers.strava.com)
2. Edit your application
3. Update **Authorization Callback Domain** to your Netlify domain (e.g., `amazing-app-123.netlify.app`)
4. Update **Website** URL as well
5. Save changes

### 5.4 Redeploy Site
1. In Netlify dashboard, go to **Deploys**
2. Click **"Trigger deploy"** → **"Deploy site"**
3. Wait for deployment to complete (2-3 minutes)

**✅ Success Check:** Your site should be live at `https://your-site-name.netlify.app`

---

## 🧪 Step 6: Test Your Deployment

### 6.1 Basic Functionality Test
1. Visit your deployed site
2. You should see the RunSight welcome screen
3. Click **"Connect with Strava"**
4. Complete Strava OAuth flow
5. You should be redirected back to your dashboard

### 6.2 Data Sync Test
1. In the dashboard, click **"Sync Data"**
2. Select a time period (start with "Last 7 days")
3. Wait for sync to complete
4. Verify your runs appear in the dashboard

### 6.3 Weather Data Test
1. Check if runs show weather icons
2. If no weather data appears, check:
   - OpenWeatherMap API key is correct
   - API key is activated (can take 10-60 minutes)
   - Check Netlify function logs for errors

**✅ Success Check:** You should see your Strava runs with basic weather information.

---

## 🔧 Troubleshooting Common Issues

### Issue: "Authentication Failed"
**Symptoms:** Can't connect to Strava, gets stuck on auth screen
**Solutions:**
1. Check Strava callback domain matches your Netlify domain exactly
2. Verify `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET` are correct
3. Check Netlify function logs for detailed errors

### Issue: "Database Connection Failed"  
**Symptoms:** Can't load dashboard, database errors
**Solutions:**
1. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are correct
2. Check all migrations ran successfully in Supabase SQL Editor
3. Verify RLS policies are enabled on all tables

### Issue: "No Weather Data"
**Symptoms:** Runs sync but no weather information
**Solutions:**
1. Verify `OPENWEATHER_API_KEY` is correct and activated
2. For historical weather, upgrade to paid OpenWeatherMap plan
3. Check Netlify function logs for API errors

### Issue: "Build Failed"
**Symptoms:** Netlify deployment fails
**Solutions:**
1. Check Node version is set to 18 in Netlify
2. Verify all environment variables are set
3. Check build logs for specific error messages

### Issue: "Functions Not Working"
**Symptoms:** API calls fail, sync doesn't work
**Solutions:**
1. Verify Netlify Functions are enabled
2. Check function logs in Netlify dashboard
3. Ensure all environment variables are set correctly

---

## 📊 Monitoring Your Deployment

### Netlify Dashboard
- **Site Overview:** Deployment status and site URL
- **Functions:** Monitor API function performance and logs
- **Analytics:** Basic traffic and performance metrics

### Supabase Dashboard  
- **Database:** Monitor table sizes and query performance
- **Auth:** Track user authentication events
- **Logs:** View database query logs and errors

### Performance Tips
- Monitor function execution time (should be < 10 seconds)
- Check database query performance in Supabase
- Use Netlify Analytics to track user engagement

---

## 🔒 Security Best Practices

### Environment Variables
- ✅ Never commit API keys to Git
- ✅ Use Netlify environment variables for all secrets
- ✅ Regularly rotate API keys (every 6-12 months)

### Database Security
- ✅ Row Level Security (RLS) is enabled by default
- ✅ Users can only access their own data
- ✅ Service role key is only used in server functions

### API Security
- ✅ All external API calls happen server-side
- ✅ Rate limiting is implemented for Strava API
- ✅ Input validation on all user data

---

## 🎉 Next Steps

Congratulations! Your RunSight Web instance is now live. Here's what you can do next:

### Immediate Actions
1. **Test thoroughly** with your own Strava data
2. **Customize branding** (update site name, colors, etc.)
3. **Set up custom domain** (optional, in Netlify settings)

### Optional Enhancements
1. **Upgrade OpenWeatherMap** for full historical weather data
2. **Add Google Analytics** for usage tracking
3. **Set up monitoring** with Sentry or similar service

### Share Your Instance
- Your RunSight Web instance is ready for personal use
- Share with friends who want running analytics
- Consider contributing improvements back to the open source project

---

## 📞 Getting Help

If you run into issues:

1. **Check the logs:**
   - Netlify function logs for API issues
   - Browser console for frontend errors
   - Supabase logs for database issues

2. **Common solutions:**
   - Redeploy after changing environment variables
   - Clear browser cache if seeing old versions
   - Check API key activation status

3. **Get support:**
   - [GitHub Issues](https://github.com/surendranb/runsight-web/issues) for bugs
   - [GitHub Discussions](https://github.com/surendranb/runsight-web/discussions) for questions
   - Check existing issues for similar problems

---

**🎯 Total Setup Time:** 30-45 minutes  
**💰 Monthly Cost:** $0 (free tiers) to $40 (with historical weather)  
**🔧 Maintenance:** Minimal - just keep dependencies updated

Happy running and analyzing! 🏃‍♂️📊
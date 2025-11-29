# RunSight Core 🏃‍♂️

**Open-source running analytics dashboard that transforms your Strava data into actionable insights.**

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/surendranb/runsight-core)

<!-- Project Status & Quality Badges -->
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![GitHub issues](https://img.shields.io/github/issues/surendranb/runsight-core)](https://github.com/surendranb/runsight-core/issues)
[![GitHub stars](https://img.shields.io/github/stars/surendranb/runsight-core)](https://github.com/surendranb/runsight-core/stargazers)
[![Live Demo](https://img.shields.io/badge/Live-Demo-success?logo=netlify&logoColor=white)](https://resonant-pony-ea7953.netlify.app/)

<!-- Tech Stack Badges -->
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Netlify](https://img.shields.io/badge/Netlify-Serverless-00C7B7?logo=netlify&logoColor=white)](https://www.netlify.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)

<!-- Running & Data Badges -->
[![Strava API](https://img.shields.io/badge/Strava-API_v3-FC4C02?logo=strava&logoColor=white)](https://developers.strava.com/)
[![Weather Data](https://img.shields.io/badge/Weather-OpenWeatherMap-FFA500?logo=openweathermap&logoColor=white)](https://openweathermap.org/)
[![Privacy First](https://img.shields.io/badge/Privacy-First-4CAF50?logo=shield&logoColor=white)](#-privacy--security-first)
[![Mobile Ready](https://img.shields.io/badge/Mobile-Ready-2196F3?logo=mobile&logoColor=white)](#-modern-user-experience)

<!-- Running Community Badges -->
[![Built by Runners](https://img.shields.io/badge/Built_by-Runners-E91E63?logo=run&logoColor=white)](#-community)
[![10+ Insights](https://img.shields.io/badge/Insights-10+-FF9800?logo=analytics&logoColor=white)](#-what-is-runsight-core)
[![Weather Analysis](https://img.shields.io/badge/Weather-Analysis-87CEEB?logo=cloud&logoColor=white)](#-key-features)
[![Personal Records](https://img.shields.io/badge/Track-PRs-FFD700?logo=trophy&logoColor=white)](#-key-features)

![RunSight Dashboard](https://via.placeholder.com/800x400/4F46E5/FFFFFF?text=RunSight+Dashboard+Screenshot)

---

## 🎯 What is RunSight Core?

RunSight Core connects to your Strava account and provides **10+ specialized insights** about your running performance, including:

- 📈 **Performance Trends** - Track pace, distance, and consistency over time
- 🌤️ **Weather Impact** - See how temperature, humidity, and wind affect your runs
- 🏔️ **Elevation Analysis** - Understand how hills impact your effort and pace
- 📍 **Location Intelligence** - Discover your best running routes and locations
- 🎯 **Personal Records** - Track PRs across different distances and conditions

**Perfect for:** Recreational runners, competitive athletes, and data enthusiasts who want deeper insights than Strava provides.

---

## 🚀 Quick Start (5 minutes)

### Option 1: One-Click Deploy
1. **Click the "Deploy to Netlify" button above**
2. **Connect your GitHub account** and fork the repository
3. **Follow the setup wizard** - it will guide you through API configuration
4. **Connect your Strava account** and start analyzing your runs!

### Option 2: Self-Host
```bash
# 1. Clone and setup
git clone https://github.com/surendranb/runsight-core.git
cd runsight-core
npm install
npm run setup  # Validates your environment

# 2. Follow the detailed setup guide
# See docs/DEPLOYMENT.md for complete instructions
```

**⏱️ Total setup time:** 30-45 minutes  
**💰 Cost:** Free (using free tiers of all services)

---

## ✨ Key Features

### 🔒 Privacy & Security First
- **Your data stays yours** - Self-hosted on your own Netlify/Supabase accounts
- **Zero credential exposure** - All API keys stored securely server-side
- **Row-level security** - Users can only access their own data

### 📊 Advanced Analytics
- **10+ Specialized Insights** - Go beyond basic Strava statistics
- **Tabbed Navigation** - Organized insights by Overview, Performance, Training, Environment, and Analysis
- **Weather Integration** - Historical weather data for every run
- **Outlier Detection** - Filters GPS errors and unrealistic data
- **Smart Highlighting** - Automatically identifies interesting patterns

### 🎨 Modern User Experience
- **Cognitive Load Aware** - Shows essential info first, details on demand
- **Tabbed Organization** - Insights grouped by runner intent and training goals
- **Mobile Responsive** - Works perfectly on all devices with touch-friendly navigation
- **Fast & Reliable** - Optimized for performance with large datasets

---

## 📸 Screenshots

<details>
<summary>🖼️ View Dashboard Screenshots</summary>

### Main Dashboard
![Dashboard Overview](https://via.placeholder.com/600x400/4F46E5/FFFFFF?text=Dashboard+Overview)

### Insights Hub
![Insights Page](https://via.placeholder.com/600x400/059669/FFFFFF?text=Insights+Hub+with+Tabbed+Navigation)

### Weather Analysis
![Weather Insights](https://via.placeholder.com/600x400/DC2626/FFFFFF?text=Weather+Analysis)

</details>

---

## 🏗️ Architecture

RunSight Core uses a **secure, serverless architecture**:

```
React Frontend → Netlify Functions → Supabase Database
                      ↓
              External APIs (Strava, Weather)
```

**Tech Stack:**
- **Frontend:** React 18 + TypeScript + Tailwind CSS
- **Backend:** Netlify Functions (Node.js)
- **Database:** Supabase (PostgreSQL with RLS)
- **APIs:** Strava, OpenWeatherMap, Google AI (optional)

---

## 📚 Documentation

### 🚀 Getting Started
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Complete setup instructions (30-45 min)
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Solutions for common issues
- **[Setup Script](scripts/setup.js)** - Automated validation and setup help

### 🛠️ For Developers
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute to the project
- **[Architecture Overview](docs/ARCHITECTURE.md)** - Technical deep dive
- **[Issue Templates](.github/ISSUE_TEMPLATE/)** - Bug reports and feature requests

### 📋 Quick Reference
<details>
<summary>📖 Essential Commands</summary>

```bash
# Development
npm run dev          # Start development server
npm run build        # Production build
npm run setup        # Validate setup and create checklists

# Deployment
npm run check-env    # Validate environment variables
npm run lint         # Check code quality
```

</details>

<details>
<summary>🔧 Required Environment Variables</summary>

```bash
# Strava API (get from developers.strava.com)
STRAVA_CLIENT_ID=your_client_id
STRAVA_CLIENT_SECRET=your_client_secret
STRAVA_REDIRECT_URI=https://your-site.netlify.app/auth/callback

# Supabase (get from your Supabase project)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key

# OpenWeatherMap (get from openweathermap.org)
OPENWEATHER_API_KEY=your_api_key
```

</details>

---

## 🤝 Contributing

We welcome contributions! RunSight Core is built by runners, for runners.

### 🐛 Found a Bug?
- [Report it here](https://github.com/surendranb/runsight-core/issues/new?template=bug_report.md)
- Include steps to reproduce and your environment details

### 💡 Have an Idea?
- [Suggest a feature](https://github.com/surendranb/runsight-core/issues/new?template=feature_request.md)
- Check existing issues to avoid duplicates

### 👩‍💻 Want to Code?
- Read our [Contributing Guide](CONTRIBUTING.md)
- Look for issues labeled `good first issue`
- Join discussions in [GitHub Discussions](https://github.com/surendranb/runsight-core/discussions)

---

## 🌟 Community

### 📊 Project Stats
- **🏃‍♂️ Built for runners** - Created by active runners who understand the data
- **🔒 Privacy focused** - Your data never leaves your control
- **🚀 Production ready** - Used by real runners with years of Strava data
- **📱 Mobile optimized** - Works great on phones and tablets

### 🙏 Contributors
Thanks to all the amazing people who have contributed to RunSight Core!

<!-- Contributors will be automatically added here -->

### 💬 Get Help
- **[GitHub Discussions](https://github.com/surendranb/runsight-core/discussions)** - Ask questions and share experiences
- **[GitHub Issues](https://github.com/surendranb/runsight-core/issues)** - Report bugs and request features
- **[Documentation](docs/)** - Comprehensive guides and troubleshooting

---

## 📄 License

MIT License - feel free to use RunSight Core for personal or commercial projects.

**What this means:**
- ✅ Use it for personal running analytics
- ✅ Deploy it for your running club or team
- ✅ Modify it to fit your needs
- ✅ Contribute improvements back to the community

---

## 🎉 Ready to Get Started?

1. **[Deploy to Netlify](https://app.netlify.com/start/deploy?repository=https://github.com/surendranb/runsight-core)** - One-click deployment
2. **[Read the Setup Guide](docs/DEPLOYMENT.md)** - Detailed instructions
3. **[Join the Community](https://github.com/surendranb/runsight-core/discussions)** - Connect with other users

**Happy running and analyzing! 🏃‍♂️📊**

---

<div align="center">

**⭐ Star this repo if RunSight Core helps improve your running! ⭐**

Made with ❤️ by runners, for runners

</div>

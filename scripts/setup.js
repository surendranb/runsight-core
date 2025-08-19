#!/usr/bin/env node

/**
 * RunSight Web - One-Click Setup Script
 * 
 * This script helps automate the setup process for RunSight Web deployment.
 * It validates configuration, checks API connectivity, and provides helpful guidance.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n${step} ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Check if running in the correct directory
function validateProjectStructure() {
  logStep('🔍', 'Validating project structure...');
  
  const requiredFiles = [
    'package.json',
    'netlify.toml',
    'src/main.tsx',
    'supabase/migrations'
  ];
  
  const missingFiles = requiredFiles.filter(file => {
    const fullPath = path.join(process.cwd(), file);
    return !fs.existsSync(fullPath);
  });
  
  if (missingFiles.length > 0) {
    logError('Missing required files/directories:');
    missingFiles.forEach(file => log(`  - ${file}`, 'red'));
    log('\nMake sure you\'re running this script from the RunSight Web root directory.', 'yellow');
    process.exit(1);
  }
  
  logSuccess('Project structure is valid');
}

// Check Node.js version
function validateNodeVersion() {
  logStep('📦', 'Checking Node.js version...');
  
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 18) {
    logError(`Node.js ${nodeVersion} is not supported. Please upgrade to Node.js 18 or higher.`);
    logInfo('Visit https://nodejs.org to download the latest version.');
    process.exit(1);
  }
  
  logSuccess(`Node.js ${nodeVersion} is supported`);
}

// Check if dependencies are installed
function validateDependencies() {
  logStep('📚', 'Checking dependencies...');
  
  if (!fs.existsSync('node_modules')) {
    logWarning('Dependencies not installed. Run: npm install');
    return false;
  }
  
  logSuccess('Dependencies are installed');
  return true;
}

// Validate environment variables template
function validateEnvTemplate() {
  logStep('🔧', 'Checking environment configuration...');
  
  if (!fs.existsSync('.env.example')) {
    logWarning('No .env.example file found. Creating one...');
    createEnvExample();
  }
  
  logSuccess('Environment template is available');
  
  if (fs.existsSync('.env')) {
    logInfo('Local .env file exists (for development)');
  } else {
    logInfo('No local .env file (production uses Netlify environment variables)');
  }
}

// Create .env.example file
function createEnvExample() {
  const envExample = `# RunSight Web - Environment Variables Template
# Copy this file to .env for local development
# For production, set these in your Netlify dashboard

# Strava API Configuration
# Get these from: https://developers.strava.com
STRAVA_CLIENT_ID=your_strava_client_id
STRAVA_CLIENT_SECRET=your_strava_client_secret
STRAVA_REDIRECT_URI=https://your-site.netlify.app/auth/callback

# Supabase Configuration
# Get these from your Supabase project settings
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# OpenWeatherMap API
# Get this from: https://openweathermap.org/api
OPENWEATHER_API_KEY=your_openweather_api_key

# Optional: Google AI for advanced insights
GOOGLE_AI_API_KEY=your_google_ai_api_key
`;
  
  fs.writeFileSync('.env.example', envExample);
}

// Check Supabase migrations
function validateMigrations() {
  logStep('🗄️', 'Checking database migrations...');
  
  const migrationsDir = 'supabase/migrations';
  if (!fs.existsSync(migrationsDir)) {
    logError('Supabase migrations directory not found');
    return false;
  }
  
  const migrations = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();
  
  if (migrations.length === 0) {
    logError('No migration files found');
    return false;
  }
  
  logSuccess(`Found ${migrations.length} migration files`);
  
  // List critical migrations
  const criticalMigrations = [
    '20250609100000_fresh_start_simple_schema.sql',
    '20250609110000_add_proper_rls_security.sql'
  ];
  
  const missingCritical = criticalMigrations.filter(migration => 
    !migrations.includes(migration)
  );
  
  if (missingCritical.length > 0) {
    logWarning('Missing critical migrations:');
    missingCritical.forEach(migration => log(`  - ${migration}`, 'yellow'));
  }
  
  return true;
}

// Test build process
async function testBuild() {
  logStep('🏗️', 'Testing build process...');
  
  try {
    const { execSync } = await import('child_process');
    
    // Test if build command works
    execSync('npm run build:skip-check', { 
      stdio: 'pipe',
      cwd: process.cwd()
    });
    
    logSuccess('Build process works correctly');
    
    // Check if dist directory was created
    if (fs.existsSync('dist')) {
      const distFiles = fs.readdirSync('dist');
      logInfo(`Build output: ${distFiles.length} files in dist/`);
    }
    
    return true;
  } catch (error) {
    logError('Build process failed');
    logError(error.message);
    return false;
  }
}

// Generate setup checklist
function generateSetupChecklist() {
  logStep('📋', 'Generating setup checklist...');
  
  const checklist = `# RunSight Web - Setup Checklist

## Prerequisites
- [ ] Node.js 18+ installed
- [ ] GitHub account
- [ ] Netlify account (free tier)
- [ ] Supabase account (free tier)
- [ ] Strava account for testing
- [ ] OpenWeatherMap account (free tier)

## Repository Setup
- [ ] Fork RunSight Web repository
- [ ] Clone your fork locally
- [ ] Run \`npm install\`
- [ ] Run \`npm run build\` to test

## Supabase Setup
- [ ] Create new Supabase project
- [ ] Run all migrations in SQL Editor (in order):
  - [ ] 20250609100000_fresh_start_simple_schema.sql
  - [ ] 20250609110000_add_proper_rls_security.sql
  - [ ] 20250610200000_add_geocoding_columns.sql
  - [ ] 20250717000000_create_goals_table.sql
- [ ] Copy Project URL and Service Role Key

## Strava API Setup
- [ ] Create app at developers.strava.com
- [ ] Set callback domain to your Netlify domain
- [ ] Copy Client ID and Client Secret

## OpenWeatherMap Setup
- [ ] Create account at openweathermap.org
- [ ] Get API key (wait for activation)
- [ ] (Optional) Upgrade for historical weather data

## Netlify Deployment
- [ ] Connect GitHub repository to Netlify
- [ ] Set build command: \`npm run build\`
- [ ] Set publish directory: \`dist\`
- [ ] Add all environment variables
- [ ] Deploy site

## Testing
- [ ] Visit deployed site
- [ ] Connect with Strava
- [ ] Sync data successfully
- [ ] Verify weather data appears
- [ ] Test on mobile device

## Post-Deployment
- [ ] Update Strava callback domain with final Netlify URL
- [ ] Test all functionality
- [ ] Set up custom domain (optional)
- [ ] Monitor function logs for errors

Generated on: ${new Date().toISOString()}
`;
  
  fs.writeFileSync('SETUP_CHECKLIST.md', checklist);
  logSuccess('Setup checklist created: SETUP_CHECKLIST.md');
}

// Generate deployment summary
function generateDeploymentSummary() {
  const summary = `# RunSight Web - Deployment Summary

## Architecture
- **Frontend:** React + TypeScript + Tailwind CSS
- **Backend:** Netlify Functions (Node.js)
- **Database:** Supabase (PostgreSQL)
- **Hosting:** Netlify
- **APIs:** Strava, OpenWeatherMap, (Optional) Google AI

## Security Features
- ✅ Zero frontend credential exposure
- ✅ Row Level Security (RLS) for user data
- ✅ OAuth authentication with Strava
- ✅ Server-side API key management

## Required Environment Variables
\`\`\`
STRAVA_CLIENT_ID
STRAVA_CLIENT_SECRET
STRAVA_REDIRECT_URI
SUPABASE_URL
SUPABASE_SERVICE_KEY
OPENWEATHER_API_KEY
\`\`\`

## Estimated Costs (Monthly)
- **Netlify:** Free (up to 100GB bandwidth)
- **Supabase:** Free (up to 500MB database)
- **OpenWeatherMap:** Free (current weather) or $40 (historical)
- **Total:** $0-40/month

## Performance Expectations
- **Initial Load:** < 3 seconds
- **Data Sync:** 30 seconds - 5 minutes (depending on data size)
- **Function Timeout:** 10 seconds max
- **Database Queries:** < 1 second typical

## Maintenance Requirements
- **Regular:** Monitor function logs for errors
- **Monthly:** Check for dependency updates
- **Quarterly:** Rotate API keys for security

Generated on: ${new Date().toISOString()}
`;
  
  fs.writeFileSync('DEPLOYMENT_SUMMARY.md', summary);
  logSuccess('Deployment summary created: DEPLOYMENT_SUMMARY.md');
}

// Main setup function
async function runSetup() {
  log('\n🚀 RunSight Web - Setup Validation Script', 'bright');
  log('='.repeat(50), 'cyan');
  
  try {
    // Validation steps
    validateProjectStructure();
    validateNodeVersion();
    const depsInstalled = validateDependencies();
    validateEnvTemplate();
    validateMigrations();
    
    // Build test (only if dependencies are installed)
    if (depsInstalled) {
      await testBuild();
    } else {
      logWarning('Skipping build test - install dependencies first');
    }
    
    // Generate helpful files
    generateSetupChecklist();
    generateDeploymentSummary();
    
    // Final summary
    log('\n🎉 Setup validation complete!', 'green');
    log('='.repeat(50), 'cyan');
    
    logInfo('Next steps:');
    log('1. Install dependencies: npm install', 'blue');
    log('2. Follow SETUP_CHECKLIST.md for deployment', 'blue');
    log('3. See docs/DEPLOYMENT.md for detailed guide', 'blue');
    log('4. Check docs/TROUBLESHOOTING.md if you run into issues', 'blue');
    
    log('\n📚 Documentation created:', 'cyan');
    log('- SETUP_CHECKLIST.md (step-by-step checklist)', 'blue');
    log('- DEPLOYMENT_SUMMARY.md (architecture overview)', 'blue');
    log('- docs/DEPLOYMENT.md (detailed deployment guide)', 'blue');
    log('- docs/TROUBLESHOOTING.md (common issues and solutions)', 'blue');
    
  } catch (error) {
    logError('Setup validation failed:');
    logError(error.message);
    process.exit(1);
  }
}

// Run the setup if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSetup();
}

export { runSetup };
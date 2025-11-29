// src/components/common/SetupGuide.tsx
import React, { useState } from 'react';
import { StandardButton } from './StandardButton';
import { SyncPeriod } from '../NavigationBar';

export const SetupGuide = ({ missingVars }: { missingVars: string }) => {
  const [generatedSecret, setGeneratedSecret] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const handleReload = () => {
    window.location.reload();
  };

  const handleGenerateSecret = () => {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    // Convert bytes to a Base64 string - a common format for secrets
    const secret = btoa(String.fromCharCode.apply(null, Array.from(array)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, ''); // URL-safe Base64
    setGeneratedSecret(secret);
    setCopied(false); // Reset copied state
  };

  const handleCopyToClipboard = () => {
    if (generatedSecret) {
      navigator.clipboard.writeText(generatedSecret).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
      });
    }
  };

  const netlifyHostname = window.location.hostname;
  const stravaCallbackUrl = `https://${netlifyHostname}/auth/callback`;
  const netlifyEnvUrl = `https://app.netlify.com/sites/${netlifyHostname.split('.')[0]}/settings/env`;

  return (
    <div style={{
      fontFamily: 'sans-serif',
      lineHeight: '1.6',
      color: '#333',
      maxWidth: '800px',
      margin: '40px auto',
      padding: '20px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      backgroundColor: '#f9f9f9',
    }}>
      <h1 style={{ borderBottom: '2px solid #a78bfa', paddingBottom: '10px', color: '#4c1d95' }}>
        🎉 Welcome to RunSight! Let's Get You Set Up.
      </h1>

      <p>Your site has been successfully deployed, but it's not configured yet. Follow these steps to connect your services.</p>
      
      <p style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '10px', borderRadius: '4px', color: '#b91c1c' }}>
        <strong>Action Required:</strong> The following environment variables are missing: <br/>
        <code>{missingVars}</code>
      </p>

      <h2>Step 1: Configure Strava API</h2>
      <p>You need to tell Strava about your new website to allow login.</p>
      <ol>
        <li>Go to your <a href="https://www.strava.com/settings/api" target="_blank" rel="noopener noreferrer">Strava API Applications</a> page.</li>
        <li>Create a new application or edit your existing one.</li>
        <li>Find the field named <strong>"Authorization Callback Domain"</strong> and enter:</li>
        <pre style={{ backgroundColor: '#eee', padding: '10px', borderRadius: '4px' }}><code>{netlifyHostname}</code></pre>
        <li>This will give you a <strong>Client ID</strong> and a <strong>Client Secret</strong>. Keep these safe for the next step.</li>
      </ol>

      <h2>Step 2: Get Your Supabase & Other Keys</h2>
      <ol>
        <li>
          <strong>Supabase Keys:</strong> Go to your Supabase project dashboard.
          <ul>
            <li>Navigate to <strong>Project Settings</strong> {'>'} <strong>API</strong>.</li>
            <li>You will need the <strong>Project URL</strong> and the <strong><code>service_role</code> secret</strong> key.</li>
          </ul>
        </li>
        <li>
          <strong>JWT Secret:</strong> Generate a strong, random secret for signing sessions using the generator below.
        </li>
        <li>
          <strong>OpenWeather API Key (Optional):</strong> If you want weather data, get a free API key from <a href="https://openweathermap.org/api" target="_blank" rel="noopener noreferrer">OpenWeatherMap</a>.
        </li>
      </ol>
      
      {/* In-App JWT Secret Generator */}
      <div style={{ border: '1px dashed #a78bfa', padding: '15px', borderRadius: '8px', marginTop: '15px', backgroundColor: '#f5f3ff' }}>
        <h3 style={{ marginTop: 0, color: '#4c1d95' }}>JWT Secret Generator</h3>
        <p style={{ fontSize: '14px', color: '#5b21b6' }}>Click the button to generate a secure, random secret. Then, copy it and paste it into Netlify for the `JWT_SECRET` variable.</p>
        <StandardButton onClick={handleGenerateSecret} className="bg-violet-500 hover:bg-violet-600 text-white">
          Generate Secret
        </StandardButton>
        {generatedSecret && (
          <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input 
              type="text" 
              value={generatedSecret} 
              readOnly 
              style={{ flexGrow: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontFamily: 'monospace' }}
            />
            <StandardButton onClick={handleCopyToClipboard} className="bg-gray-200 hover:bg-gray-300">
              {copied ? 'Copied!' : 'Copy'}
            </StandardButton>
          </div>
        )}
      </div>


      <h2>Step 3: Add Environment Variables to Netlify</h2>
      <p>Now, you need to provide all these keys to your Netlify site so it can function securely.</p>
      <ol>
        <li>
          Go to your Netlify environment variables settings. Here is a direct link for your site:
          <br />
          <a href={netlifyEnvUrl} target="_blank" rel="noopener noreferrer">{netlifyEnvUrl}</a>
        </li>
        <li>Click <strong>"Add a variable"</strong> and add the following keys one by one:</li>
      </ol>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
        <thead>
          <tr style={{ backgroundColor: '#eee' }}>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Variable Name</th>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style={{ padding: '8px', border: '1px solid #ddd' }}><code>VITE_SUPABASE_URL</code></td><td style={{ padding: '8px', border: '1px solid #ddd' }}>Your Supabase Project URL</td></tr>
          <tr><td style={{ padding: '8px', border: '1px solid #ddd' }}><code>SUPABASE_SERVICE_KEY</code></td><td style={{ padding: '8px', border: '1px solid #ddd' }}>Your Supabase `service_role` key</td></tr>
          <tr><td style={{ padding: '8px', border: '1px solid #ddd' }}><code>VITE_STRAVA_CLIENT_ID</code></td><td style={{ padding: '8px', border: '1px solid #ddd' }}>Your Strava Client ID</td></tr>
          <tr><td style={{ padding: '8px', border: '1px solid #ddd' }}><code>VITE_STRAVA_CLIENT_SECRET</code></td><td style={{ padding: '8px', border: '1p solid #ddd' }}>Your Strava Client Secret</td></tr>
          <tr><td style={{ padding: '8px', border: '1px solid #ddd' }}><code>VITE_STRAVA_REDIRECT_URI</code></td><td style={{ padding: '8px', border: '1px solid #ddd' }}>{stravaCallbackUrl}</td></tr>
          <tr><td style={{ padding: '8px', border: '1px solid #ddd' }}><code>VITE_FRONTEND_URL</code></td><td style={{ padding: '8px', border: '1px solid #ddd' }}>https://{netlifyHostname}</td></tr>
          <tr><td style={{ padding: '8px', border: '1px solid #ddd' }}><code>JWT_SECRET</code></td><td style={{ padding: '8px', border: '1px solid #ddd' }}>Use the generator above and copy/paste here</td></tr>
          <tr><td style={{ padding: '8px', border: '1px solid #ddd' }}><code>OPENWEATHER_API_KEY</code></td><td style={{ padding: '8px', border: '1px solid #ddd' }}>Your OpenWeatherMap API key (optional)</td></tr>
        </tbody>
      </table>

      <h2>Step 4: Re-deploy Your Site</h2>
      <p>For the new environment variables to take effect, you must re-deploy your site.</p>
      <ol>
        <li>Go to the <strong>Deploys</strong> tab for your site in Netlify.</li>
        <li>Find the latest deploy for the `main` branch, click the <strong>"Retry with latest branch commit"</strong> button.</li>
      </ol>
      <p>Once the new deploy is live, this setup guide will disappear and you'll see the real application. Good luck!</p>

      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <StandardButton onClick={handleReload}>
          Re-check Configuration
        </StandardButton>
      </div>
    </div>
  );
};
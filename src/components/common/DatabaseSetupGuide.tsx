// src/components/common/DatabaseSetupGuide.tsx
import React, { useState } from 'react';
import { StandardButton } from './StandardButton';

interface DatabaseSetupGuideProps {
  onVerify: () => void;
  supabaseUrl: string;
}

export const DatabaseSetupGuide: React.FC<DatabaseSetupGuideProps> = ({ onVerify, supabaseUrl }) => {
  const [script, setScript] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const supabaseProjectRef = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\..+/)?.[1];
  const supabaseSqlEditorUrl = supabaseProjectRef 
    ? `https://app.supabase.com/project/${supabaseProjectRef}/sql` 
    : 'https://app.supabase.com/dashboard/projects';

  const handleCopyScript = async () => {
    try {
      if (!script) {
        const response = await fetch('/setup.sql');
        if (!response.ok) {
          throw new Error('Failed to fetch setup.sql. Make sure it is in the public directory.');
        }
        const sqlScript = await response.text();
        setScript(sqlScript);
        copyToClipboard(sqlScript);
      } else {
        copyToClipboard(script);
      }
    } catch (e: any) {
      setError('Could not fetch or copy the setup script. Please check the browser console for more details.');
      console.error(e);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

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
      <h1 style={{ borderBottom: '2px solid #10b981', paddingBottom: '10px', color: '#047857' }}>
        Final Step: Set Up Your Database
      </h1>

      <p>Welcome! Your application is configured and you're logged in. The last step is to create the necessary tables in your Supabase database.</p>
      
      {error && (
        <p style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '10px', borderRadius: '4px', color: '#b91c1c' }}>
          <strong>Error:</strong> {error}
        </p>
      )}

      <h2>Instructions</h2>
      <ol style={{ paddingLeft: '20px' }}>
        <li style={{ marginBottom: '15px' }}>
          <strong>Click the button below</strong> to copy the database setup script to your clipboard.
          <div style={{ marginTop: '10px' }}>
            <StandardButton onClick={handleCopyScript} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {copied ? 'Copied to Clipboard!' : 'Copy Setup Script'}
            </StandardButton>
          </div>
        </li>
        <li style={{ marginBottom: '15px' }}>
          <strong>Open your Supabase SQL Editor</strong> in a new tab. A direct link is provided below.
          <div style={{ marginTop: '10px' }}>
            <a href={supabaseSqlEditorUrl} target="_blank" rel="noopener noreferrer">
              <StandardButton className="bg-gray-200 hover:bg-gray-300">Open Supabase SQL Editor</StandardButton>
            </a>
          </div>
        </li>
        <li style={{ marginBottom: '15px' }}>
          In the Supabase SQL Editor, <strong>paste the script</strong> into the query window and click the <strong>"RUN"</strong> button.
        </li>
        <li style={{ marginBottom: '15px' }}>
          Once the script has finished successfully, come back here and click <strong>"Verify Setup"</strong>.
          <div style={{ marginTop: '10px' }}>
            <StandardButton onClick={onVerify} className="bg-blue-600 hover:bg-blue-700 text-white">
              Verify Setup
            </StandardButton>
          </div>
        </li>
      </ol>
      <p>After verification, your app will reload and begin your first data sync.</p>
    </div>
  );
};

import React from 'react';
import ReactDOM from 'react-dom/client';
import SecureApp from './SecureApp';
import { ToastProvider } from './components/common/ErrorToast';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <SecureApp />
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
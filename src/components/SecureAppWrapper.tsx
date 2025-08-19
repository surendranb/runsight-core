import React from 'react';
import { ErrorBoundary } from './common/ErrorBoundary';
import { ToastProvider } from './common/ErrorToast';
import SecureApp from '../SecureApp';

/**
 * Wrapper component that provides error handling infrastructure
 * for the entire SecureApp component tree.
 * 
 * This includes:
 * - Error boundary for catching React errors
 * - Toast provider for non-intrusive error notifications
 * - Production error handling integration
 */
const SecureAppWrapper: React.FC = () => {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <SecureApp />
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default SecureAppWrapper;
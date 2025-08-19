import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorDisplay, useErrorTranslation } from './ErrorDisplay';
import { productionErrorHandler } from '../../lib/production-error-handler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Cognitive Load Aware Error Boundary
 * 
 * Catches JavaScript errors anywhere in the child component tree and displays
 * user-friendly error messages with recovery options instead of a blank screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error with production error handler
    const productionError = productionErrorHandler.handleNetlifyFunctionError(
      error,
      'react-error-boundary',
      {
        operation: 'component-error',
        endpoint: window.location.pathname
      }
    );

    this.setState({ errorInfo });

    // Call optional error callback
    this.props.onError?.(error, errorInfo);

    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error display with recovery options
      return <ErrorBoundaryFallback error={this.state.error} errorInfo={this.state.errorInfo} />;
    }

    return this.props.children;
  }
}

/**
 * Fallback component for error boundary
 */
const ErrorBoundaryFallback: React.FC<{ 
  error: Error; 
  errorInfo: ErrorInfo | null; 
}> = ({ error, errorInfo }) => {
  const { translateError } = useErrorTranslation();

  const translatedError = translateError(error, 'Application Error');

  // Add specific recovery options for application errors
  const errorWithRecovery = {
    ...translatedError,
    title: 'Application Error',
    message: 'Something went wrong with the application. This is usually a temporary issue.',
    recoveryOptions: [
      {
        label: 'Reload Application',
        description: 'Refresh the page to restart the application',
        action: () => window.location.reload(),
        primary: true
      },
      {
        label: 'Go to Dashboard',
        description: 'Return to the main dashboard',
        action: () => {
          window.location.href = '/';
        }
      },
      {
        label: 'Clear Data & Restart',
        description: 'Clear stored data and restart (you\'ll need to reconnect)',
        action: () => {
          localStorage.clear();
          sessionStorage.clear();
          window.location.href = '/';
        }
      }
    ],
    details: errorInfo ? `${error.stack}\n\nComponent Stack:\n${errorInfo.componentStack}` : error.stack
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            RunSight Web
          </h1>
          <p className="text-gray-600">
            Running Analytics Dashboard
          </p>
        </div>
        
        <ErrorDisplay 
          error={errorWithRecovery}
          className="shadow-lg"
        />
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            If this problem persists, try clearing your browser data or contact support.
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Hook for handling errors in functional components
 */
export const useErrorHandler = () => {
  const { translateError } = useErrorTranslation();

  const handleError = (error: any, context?: string) => {
    const translatedError = translateError(error, context);
    
    // Log to production error handler
    productionErrorHandler.handleNetlifyFunctionError(
      error,
      'component-error',
      { operation: context || 'unknown' }
    );

    return translatedError;
  };

  return { handleError };
};

/**
 * Higher-order component for adding error boundary to any component
 */
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};
import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { X, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { ErrorDisplayProps } from './ErrorDisplay';

export interface Toast {
  id: string;
  title: string;
  message: string;
  type: 'error' | 'warning' | 'info' | 'success';
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void;
  showError: (error: ErrorDisplayProps['error']) => void;
  hideToast: (id: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

/**
 * Toast Provider Component
 * 
 * Provides a context for showing non-intrusive error messages and notifications
 * that don't block the user interface but still provide important feedback.
 */
export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 15);
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? (toast.type === 'error' ? 8000 : 5000)
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-hide toast after duration (unless persistent)
    if (!toast.persistent && newToast.duration) {
      setTimeout(() => {
        hideToast(id);
      }, newToast.duration);
    }
  };

  const showError = (error: ErrorDisplayProps['error']) => {
    showToast({
      title: error.title,
      message: error.message,
      type: error.type,
      duration: error.type === 'error' ? 10000 : 6000, // Longer duration for errors
      action: error.recoveryOptions?.[0] ? {
        label: error.recoveryOptions[0].label,
        onClick: error.recoveryOptions[0].action
      } : undefined
    });
  };

  const hideToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const clearAllToasts = () => {
    setToasts([]);
  };

  return (
    <ToastContext.Provider value={{ showToast, showError, hideToast, clearAllToasts }}>
      {children}
      <ToastContainer toasts={toasts} onHide={hideToast} />
    </ToastContext.Provider>
  );
};

/**
 * Hook for using toast notifications
 */
export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

/**
 * Toast Container Component
 * 
 * Renders all active toasts in a fixed position overlay
 */
const ToastContainer: React.FC<{
  toasts: Toast[];
  onHide: (id: string) => void;
}> = ({ toasts, onHide }) => {
  if (toasts.length === 0) return null;

  return (
    <div 
      className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map(toast => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onHide={() => onHide(toast.id)}
        />
      ))}
    </div>
  );
};

/**
 * Individual Toast Item Component
 */
const ToastItem: React.FC<{
  toast: Toast;
  onHide: () => void;
}> = ({ toast, onHide }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleHide = () => {
    setIsLeaving(true);
    setTimeout(onHide, 300); // Wait for exit animation
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStyles = () => {
    const baseStyles = "bg-white border-l-4 shadow-lg rounded-lg p-4 transition-all duration-300 ease-in-out";
    
    if (isLeaving) {
      return `${baseStyles} transform translate-x-full opacity-0`;
    }
    
    if (!isVisible) {
      return `${baseStyles} transform translate-x-full opacity-0`;
    }

    switch (toast.type) {
      case 'success':
        return `${baseStyles} border-green-500`;
      case 'warning':
        return `${baseStyles} border-yellow-500`;
      case 'info':
        return `${baseStyles} border-blue-500`;
      default:
        return `${baseStyles} border-red-500`;
    }
  };

  return (
    <div 
      className={getStyles()}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        
        <div className="ml-3 flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900">
            {toast.title}
          </h4>
          <p className="mt-1 text-sm text-gray-600">
            {toast.message}
          </p>
          
          {toast.action && (
            <div className="mt-3">
              <button
                onClick={() => {
                  toast.action!.onClick();
                  handleHide();
                }}
                className="text-sm font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:underline"
              >
                {toast.action.label}
              </button>
            </div>
          )}
        </div>
        
        <div className="ml-4 flex-shrink-0">
          <button
            onClick={handleHide}
            className="inline-flex rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Utility function to show error toasts from anywhere in the app
 */
export const showErrorToast = (error: ErrorDisplayProps['error']) => {
  // This is a fallback for when ToastProvider is not available
  // In practice, components should use the useToast hook
  console.error('Error toast (fallback):', error);
  
  // Show browser notification as fallback
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(error.title, {
      body: error.message,
      icon: '/favicon.ico'
    });
  } else {
    // Fallback to alert (not ideal for UX but ensures user sees the error)
    alert(`${error.title}\n\n${error.message}`);
  }
};
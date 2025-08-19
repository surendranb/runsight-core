import React from 'react';
import { LucideIcon } from 'lucide-react';
import { getFittsClasses } from '../../lib/fittsLaw';

interface StandardButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  fullWidth?: boolean;
}

// Conventional button styles following web standards with Fitts's Law compliance
const buttonVariants = {
  primary: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white border-transparent focus:ring-blue-500',
  secondary: 'bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-900 border-gray-300 focus:ring-gray-500',
  success: 'bg-green-600 hover:bg-green-700 active:bg-green-800 text-white border-transparent focus:ring-green-500',
  warning: 'bg-yellow-600 hover:bg-yellow-700 active:bg-yellow-800 text-white border-transparent focus:ring-yellow-500',
  danger: 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white border-transparent focus:ring-red-500',
  ghost: 'bg-transparent hover:bg-gray-100 active:bg-gray-200 text-gray-700 border-transparent focus:ring-gray-500'
};

// Fitts's Law compliant button sizes
const buttonSizes = {
  // Mobile-first approach: 44px minimum touch target, 32px minimum desktop
  sm: 'min-h-[44px] min-w-[44px] px-4 py-3 text-sm md:min-h-[32px] md:min-w-[32px] md:px-3 md:py-2',
  md: 'min-h-[44px] min-w-[44px] px-5 py-3 text-sm md:min-h-[36px] md:min-w-[36px] md:px-4 md:py-2',
  lg: 'min-h-[48px] min-w-[48px] px-6 py-3 text-base md:min-h-[40px] md:min-w-[40px] md:px-5 md:py-2.5'
};

// Responsive icon sizes optimized for touch targets
const iconSizes = {
  sm: 'w-4 h-4 md:w-3.5 md:h-3.5',
  md: 'w-5 h-5 md:w-4 md:h-4',
  lg: 'w-6 h-6 md:w-5 md:h-5'
};

export const StandardButton: React.FC<StandardButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  disabled = false,
  loading = false,
  className = '',
  type = 'button',
  fullWidth = false
}) => {
  const baseClasses = `
    inline-flex items-center justify-center
    font-medium rounded-lg border
    transition-all duration-200 ease-in-out
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    select-none
    touch-manipulation
    ${fullWidth ? 'w-full' : ''}
  `;

  const variantClasses = buttonVariants[variant];
  const sizeClasses = buttonSizes[size];
  const iconSizeClasses = iconSizes[size];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses} ${sizeClasses} ${className}`}
      // Improve touch responsiveness
      style={{ 
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation'
      }}
    >
      {loading ? (
        <>
          <div className={`animate-spin rounded-full border-2 border-current border-t-transparent ${iconSizeClasses} ${children ? 'mr-2' : ''}`} />
          {children && <span>Loading...</span>}
        </>
      ) : (
        <>
          {Icon && iconPosition === 'left' && (
            <Icon className={`${iconSizeClasses} ${children ? 'mr-2' : ''} flex-shrink-0`} />
          )}
          {children && <span className="truncate">{children}</span>}
          {Icon && iconPosition === 'right' && (
            <Icon className={`${iconSizeClasses} ${children ? 'ml-2' : ''} flex-shrink-0`} />
          )}
        </>
      )}
    </button>
  );
};

// Conventional dropdown component
interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface StandardDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
}

export const StandardDropdown: React.FC<StandardDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  className = '',
  size = 'md',
  icon: Icon
}) => {
  // Fitts's Law compliant dropdown sizes
  const sizeClasses = {
    sm: 'min-h-[44px] px-4 py-3 text-sm md:min-h-[32px] md:px-3 md:py-2',
    md: 'min-h-[44px] px-4 py-3 text-sm md:min-h-[36px] md:px-3 md:py-2',
    lg: 'min-h-[48px] px-5 py-3 text-base md:min-h-[40px] md:px-4 md:py-2.5'
  };

  const iconSize = size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';

  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`
          ${sizeClasses[size]}
          ${Icon ? 'pl-12 md:pl-10' : ''}
          pr-12 md:pr-10
          w-full
          border border-gray-300 rounded-lg bg-white
          focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none
          hover:border-gray-400 transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          appearance-none cursor-pointer
          select-none touch-manipulation
        `}
        style={{ 
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation'
        }}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      
      {Icon && (
        <Icon className={`absolute left-4 md:left-3 top-1/2 transform -translate-y-1/2 ${iconSize} text-gray-400 pointer-events-none`} />
      )}
      
      {/* Chevron down icon - larger for better touch targets */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-4 md:pr-3 pointer-events-none">
        <svg className={`${iconSize} text-gray-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
};
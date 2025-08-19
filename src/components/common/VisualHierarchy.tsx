import React from 'react';
import { LucideIcon } from 'lucide-react';

// Visual hierarchy system following cognitive psychology principles
// Implements consistent heading structure and visual emphasis patterns

interface HeadingProps {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: React.ReactNode;
  className?: string;
  id?: string;
  emphasis?: 'primary' | 'secondary' | 'accent' | 'muted';
  icon?: LucideIcon;
  badge?: {
    text: string;
    color?: 'blue' | 'green' | 'yellow' | 'red' | 'gray';
  };
}

// Semantic heading component with consistent visual hierarchy
export const Heading: React.FC<HeadingProps> = ({
  level,
  children,
  className = '',
  id,
  emphasis = 'primary',
  icon: Icon,
  badge
}) => {
  // Define visual hierarchy styles based on level and emphasis
  const baseStyles = {
    1: 'text-3xl md:text-4xl font-bold leading-tight',
    2: 'text-2xl md:text-3xl font-semibold leading-tight',
    3: 'text-xl md:text-2xl font-semibold leading-snug',
    4: 'text-lg md:text-xl font-medium leading-snug',
    5: 'text-base md:text-lg font-medium leading-normal',
    6: 'text-sm md:text-base font-medium leading-normal'
  };

  const emphasisStyles = {
    primary: 'text-gray-900',
    secondary: 'text-gray-700',
    accent: 'text-blue-700',
    muted: 'text-gray-600'
  };

  const badgeColors = {
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    green: 'bg-green-100 text-green-700 border-green-200',
    yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    red: 'bg-red-100 text-red-700 border-red-200',
    gray: 'bg-gray-100 text-gray-700 border-gray-200'
  };

  const combinedClassName = `
    ${baseStyles[level]}
    ${emphasisStyles[emphasis]}
    ${className}
  `.trim();

  const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;

  return (
    <HeadingTag id={id} className={combinedClassName}>
      <div className="flex items-center space-x-3">
        {Icon && (
          <Icon className={`
            flex-shrink-0
            ${level <= 2 ? 'w-8 h-8' : level <= 4 ? 'w-6 h-6' : 'w-5 h-5'}
            ${emphasis === 'accent' ? 'text-blue-600' : 'text-current'}
          `} />
        )}
        <span className="flex-1">{children}</span>
        {badge && (
          <span className={`
            px-3 py-1 rounded-full text-xs font-medium border
            ${badgeColors[badge.color || 'gray']}
            flex-shrink-0
          `}>
            {badge.text}
          </span>
        )}
      </div>
    </HeadingTag>
  );
};

// Visual emphasis component for highlighting important information
interface EmphasisBoxProps {
  children: React.ReactNode;
  variant: 'insight' | 'achievement' | 'warning' | 'info' | 'success';
  title?: string;
  icon?: LucideIcon;
  className?: string;
  priority?: 'high' | 'medium' | 'low';
}

export const EmphasisBox: React.FC<EmphasisBoxProps> = ({
  children,
  variant,
  title,
  icon: Icon,
  className = '',
  priority = 'medium'
}) => {
  const variantStyles = {
    insight: {
      container: 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200',
      icon: 'text-blue-600',
      title: 'text-blue-900',
      content: 'text-blue-800'
    },
    achievement: {
      container: 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200',
      icon: 'text-green-600',
      title: 'text-green-900',
      content: 'text-green-800'
    },
    warning: {
      container: 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200',
      icon: 'text-yellow-600',
      title: 'text-yellow-900',
      content: 'text-yellow-800'
    },
    info: {
      container: 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200',
      icon: 'text-gray-600',
      title: 'text-gray-900',
      content: 'text-gray-700'
    },
    success: {
      container: 'bg-gradient-to-r from-green-50 to-teal-50 border-green-200',
      icon: 'text-green-600',
      title: 'text-green-900',
      content: 'text-green-800'
    }
  };

  const priorityStyles = {
    high: 'border-2 shadow-lg',
    medium: 'border shadow-sm',
    low: 'border shadow-sm opacity-90'
  };

  const styles = variantStyles[variant];

  return (
    <div className={`
      ${styles.container}
      ${priorityStyles[priority]}
      rounded-xl p-6
      ${className}
    `}>
      {(title || Icon) && (
        <div className="flex items-start space-x-3 mb-4">
          {Icon && (
            <Icon className={`w-6 h-6 ${styles.icon} mt-1 flex-shrink-0`} />
          )}
          {title && (
            <Heading level={4} emphasis="primary" className={styles.title}>
              {title}
            </Heading>
          )}
        </div>
      )}
      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
};

// Section container with consistent spacing and visual grouping
interface SectionProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  level?: 2 | 3 | 4;
  icon?: LucideIcon;
  badge?: {
    text: string;
    color?: 'blue' | 'green' | 'yellow' | 'red' | 'gray';
  };
  actions?: React.ReactNode;
  className?: string;
  spacing?: 'tight' | 'normal' | 'loose';
  background?: 'white' | 'gray' | 'transparent';
}

export const Section: React.FC<SectionProps> = ({
  children,
  title,
  subtitle,
  level = 2,
  icon,
  badge,
  actions,
  className = '',
  spacing = 'normal',
  background = 'white'
}) => {
  const spacingStyles = {
    tight: 'space-y-4',
    normal: 'space-y-6',
    loose: 'space-y-8'
  };

  const backgroundStyles = {
    white: 'bg-white rounded-xl shadow-sm border border-gray-200',
    gray: 'bg-gray-50 rounded-xl border border-gray-200',
    transparent: ''
  };

  const containerPadding = background !== 'transparent' ? 'p-6' : '';

  return (
    <section className={`
      ${backgroundStyles[background]}
      ${containerPadding}
      ${className}
    `}>
      {title && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1">
            <Heading 
              level={level} 
              icon={icon} 
              badge={badge}
              className="mb-2"
            >
              {title}
            </Heading>
            {subtitle && (
              <p className="text-gray-600 text-sm leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center space-x-2 ml-4">
              {actions}
            </div>
          )}
        </div>
      )}
      <div className={spacingStyles[spacing]}>
        {children}
      </div>
    </section>
  );
};

// Information scent component for clear labeling
interface InfoScentProps {
  label: string;
  description?: string;
  value?: string | number;
  unit?: string;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    value: number;
    label: string;
  };
  confidence?: number;
  className?: string;
}

export const InfoScent: React.FC<InfoScentProps> = ({
  label,
  description,
  value,
  unit,
  trend,
  confidence,
  className = ''
}) => {
  const getTrendColor = (direction: 'up' | 'down' | 'stable') => {
    switch (direction) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      case 'stable': return 'text-gray-600';
    }
  };

  const getTrendIcon = (direction: 'up' | 'down' | 'stable') => {
    switch (direction) {
      case 'up': return '↗';
      case 'down': return '↘';
      case 'stable': return '→';
    }
  };

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <dt className="text-sm font-medium text-gray-700 mb-1">
            {label}
          </dt>
          {description && (
            <dd className="text-xs text-gray-500 leading-relaxed">
              {description}
            </dd>
          )}
        </div>
        {value !== undefined && (
          <div className="text-right">
            <dd className="text-lg font-semibold text-gray-900">
              {value}
              {unit && <span className="text-sm text-gray-600 ml-1">{unit}</span>}
            </dd>
            {trend && (
              <div className={`text-xs font-medium ${getTrendColor(trend.direction)}`}>
                {getTrendIcon(trend.direction)} {trend.label}
              </div>
            )}
            {confidence !== undefined && (
              <div className="text-xs text-gray-500 mt-1">
                {(confidence * 100).toFixed(0)}% confidence
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Visual hierarchy utilities
export const visualHierarchy = {
  // Spacing scale following 8px grid
  spacing: {
    xs: 'space-y-2',
    sm: 'space-y-4',
    md: 'space-y-6',
    lg: 'space-y-8',
    xl: 'space-y-12'
  },
  
  // Typography scale
  text: {
    hero: 'text-4xl md:text-5xl font-bold',
    title: 'text-2xl md:text-3xl font-semibold',
    heading: 'text-xl md:text-2xl font-semibold',
    subheading: 'text-lg md:text-xl font-medium',
    body: 'text-base leading-relaxed',
    caption: 'text-sm text-gray-600',
    label: 'text-sm font-medium text-gray-700'
  },
  
  // Color emphasis
  emphasis: {
    primary: 'text-gray-900',
    secondary: 'text-gray-700',
    accent: 'text-blue-700',
    success: 'text-green-700',
    warning: 'text-yellow-700',
    error: 'text-red-700',
    muted: 'text-gray-500'
  }
};
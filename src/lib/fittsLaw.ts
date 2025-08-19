// Fitts's Law compliance utilities for touch targets and interactive elements
// Based on WCAG 2.1 AA guidelines and mobile usability best practices

export interface TouchTargetSpecs {
  minSize: {
    mobile: string;
    desktop: string;
  };
  spacing: {
    mobile: string;
    desktop: string;
  };
  padding: {
    mobile: string;
    desktop: string;
  };
}

// Fitts's Law compliant sizing specifications
export const TOUCH_TARGET_SPECS: TouchTargetSpecs = {
  minSize: {
    mobile: '44px', // 44px × 44px minimum for mobile (WCAG 2.1 AA)
    desktop: '32px'  // 32px × 32px minimum for desktop
  },
  spacing: {
    mobile: '8px',   // Minimum 8px spacing between touch targets on mobile
    desktop: '4px'   // Minimum 4px spacing between click targets on desktop
  },
  padding: {
    mobile: '12px',  // Generous padding for finger-friendly targets
    desktop: '8px'   // Adequate padding for mouse precision
  }
};

// Responsive classes for Fitts's Law compliance
export const FITTS_CLASSES = {
  // Button sizing classes
  button: {
    sm: 'min-h-[32px] min-w-[32px] px-3 py-1.5 md:min-h-[32px] md:min-w-[32px] touch:min-h-[44px] touch:min-w-[44px] touch:px-4 touch:py-3',
    md: 'min-h-[44px] min-w-[44px] px-4 py-2 md:min-h-[32px] md:min-w-[32px] md:px-3 md:py-2',
    lg: 'min-h-[48px] min-w-[48px] px-6 py-3 md:min-h-[40px] md:min-w-[40px] md:px-4 md:py-2'
  },
  
  // Interactive element spacing
  spacing: {
    tight: 'space-x-2 space-y-2 md:space-x-1 md:space-y-1',
    normal: 'space-x-3 space-y-3 md:space-x-2 md:space-y-2',
    loose: 'space-x-4 space-y-4 md:space-x-3 md:space-y-3'
  },
  
  // Touch-friendly padding
  padding: {
    interactive: 'p-3 md:p-2',
    clickable: 'p-4 md:p-3',
    generous: 'p-6 md:p-4'
  },
  
  // Icon sizing within interactive elements
  icon: {
    sm: 'w-4 h-4 md:w-3 md:h-3',
    md: 'w-5 h-5 md:w-4 md:h-4',
    lg: 'w-6 h-6 md:w-5 md:h-5'
  }
};

// Helper function to generate Fitts's Law compliant classes
export const getFittsClasses = (
  element: 'button' | 'link' | 'input' | 'dropdown',
  size: 'sm' | 'md' | 'lg' = 'md',
  spacing: 'tight' | 'normal' | 'loose' = 'normal'
): string => {
  const baseClasses = [
    // Ensure minimum touch target size
    'min-h-[44px] min-w-[44px]',
    'md:min-h-[32px] md:min-w-[32px]',
    
    // Touch-friendly padding
    'px-4 py-3',
    'md:px-3 md:py-2',
    
    // Prevent accidental activation
    'select-none',
    
    // Smooth interactions
    'transition-all duration-200',
    
    // Focus indicators for accessibility
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
  ];
  
  // Add element-specific classes
  switch (element) {
    case 'button':
      baseClasses.push(
        'inline-flex items-center justify-center',
        'font-medium rounded-lg',
        'disabled:opacity-50 disabled:cursor-not-allowed'
      );
      break;
      
    case 'link':
      baseClasses.push(
        'inline-flex items-center',
        'rounded-md',
        'hover:underline'
      );
      break;
      
    case 'input':
      baseClasses.push(
        'w-full rounded-lg border border-gray-300',
        'focus:border-transparent'
      );
      break;
      
    case 'dropdown':
      baseClasses.push(
        'w-full rounded-lg border border-gray-300',
        'bg-white appearance-none cursor-pointer'
      );
      break;
  }
  
  return baseClasses.join(' ');
};

// Validation function to check if an element meets Fitts's Law requirements
export const validateTouchTarget = (element: HTMLElement): {
  isCompliant: boolean;
  issues: string[];
  recommendations: string[];
} => {
  const rect = element.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(element);
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  // Check minimum size requirements
  const isMobile = window.innerWidth < 768;
  const minSize = isMobile ? 44 : 32;
  
  if (rect.width < minSize || rect.height < minSize) {
    issues.push(`Touch target is ${rect.width}×${rect.height}px, below minimum ${minSize}×${minSize}px`);
    recommendations.push(`Increase size to at least ${minSize}×${minSize}px`);
  }
  
  // Check spacing from adjacent interactive elements
  const adjacentElements = Array.from(element.parentElement?.children || [])
    .filter(child => child !== element && child instanceof HTMLElement)
    .filter(child => {
      const style = window.getComputedStyle(child);
      return style.cursor === 'pointer' || child.tagName.toLowerCase() === 'button' || child.tagName.toLowerCase() === 'a';
    }) as HTMLElement[];
  
  const minSpacing = isMobile ? 8 : 4;
  adjacentElements.forEach(adjacent => {
    const adjacentRect = adjacent.getBoundingClientRect();
    const horizontalGap = Math.min(
      Math.abs(rect.right - adjacentRect.left),
      Math.abs(adjacentRect.right - rect.left)
    );
    const verticalGap = Math.min(
      Math.abs(rect.bottom - adjacentRect.top),
      Math.abs(adjacentRect.bottom - rect.top)
    );
    
    if (horizontalGap < minSpacing || verticalGap < minSpacing) {
      issues.push(`Insufficient spacing (${Math.min(horizontalGap, verticalGap)}px) from adjacent interactive element`);
      recommendations.push(`Increase spacing to at least ${minSpacing}px`);
    }
  });
  
  // Check if element is too close to screen edges on mobile
  if (isMobile) {
    const edgeThreshold = 16; // 16px from screen edge
    if (rect.left < edgeThreshold || rect.right > window.innerWidth - edgeThreshold) {
      issues.push('Touch target too close to screen edge');
      recommendations.push('Move away from screen edges or add padding');
    }
  }
  
  return {
    isCompliant: issues.length === 0,
    issues,
    recommendations
  };
};

// Development helper to audit all interactive elements on a page
export const auditPageForFittsLaw = (): {
  totalElements: number;
  compliantElements: number;
  issues: Array<{
    element: HTMLElement;
    tagName: string;
    className: string;
    issues: string[];
    recommendations: string[];
  }>;
} => {
  const interactiveSelectors = [
    'button',
    'a[href]',
    'input[type="button"]',
    'input[type="submit"]',
    'input[type="reset"]',
    '[role="button"]',
    '[tabindex="0"]',
    'select',
    'input[type="checkbox"]',
    'input[type="radio"]'
  ];
  
  const elements = document.querySelectorAll(interactiveSelectors.join(', ')) as NodeListOf<HTMLElement>;
  const issues: Array<{
    element: HTMLElement;
    tagName: string;
    className: string;
    issues: string[];
    recommendations: string[];
  }> = [];
  
  let compliantElements = 0;
  
  elements.forEach(element => {
    const validation = validateTouchTarget(element);
    if (validation.isCompliant) {
      compliantElements++;
    } else {
      issues.push({
        element,
        tagName: element.tagName.toLowerCase(),
        className: element.className,
        issues: validation.issues,
        recommendations: validation.recommendations
      });
    }
  });
  
  return {
    totalElements: elements.length,
    compliantElements,
    issues
  };
};

// Console helper for development
export const logFittsLawAudit = (): void => {
  const audit = auditPageForFittsLaw();
  
  console.group('🎯 Fitts\'s Law Compliance Audit');
  console.log(`Total interactive elements: ${audit.totalElements}`);
  console.log(`Compliant elements: ${audit.compliantElements} (${((audit.compliantElements / audit.totalElements) * 100).toFixed(1)}%)`);
  console.log(`Non-compliant elements: ${audit.issues.length}`);
  
  if (audit.issues.length > 0) {
    console.group('❌ Issues found:');
    audit.issues.forEach((issue, index) => {
      console.group(`${index + 1}. ${issue.tagName}${issue.className ? '.' + issue.className.split(' ')[0] : ''}`);
      console.log('Issues:', issue.issues);
      console.log('Recommendations:', issue.recommendations);
      console.log('Element:', issue.element);
      console.groupEnd();
    });
    console.groupEnd();
  }
  
  console.groupEnd();
};

// Development helper to add visual indicators for touch targets
export const visualizeTouchTargets = (): void => {
  const interactiveSelectors = [
    'button',
    'a[href]',
    'input[type="button"]',
    'input[type="submit"]',
    'input[type="reset"]',
    '[role="button"]',
    '[tabindex="0"]',
    'select',
    'input[type="checkbox"]',
    'input[type="radio"]'
  ];
  
  const elements = document.querySelectorAll(interactiveSelectors.join(', ')) as NodeListOf<HTMLElement>;
  
  elements.forEach(element => {
    const validation = validateTouchTarget(element);
    
    // Add visual indicator
    const indicator = document.createElement('div');
    indicator.style.position = 'absolute';
    indicator.style.pointerEvents = 'none';
    indicator.style.zIndex = '9999';
    indicator.style.border = validation.isCompliant ? '2px solid green' : '2px solid red';
    indicator.style.borderRadius = '4px';
    indicator.style.backgroundColor = validation.isCompliant ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)';
    
    const rect = element.getBoundingClientRect();
    indicator.style.left = `${rect.left + window.scrollX}px`;
    indicator.style.top = `${rect.top + window.scrollY}px`;
    indicator.style.width = `${rect.width}px`;
    indicator.style.height = `${rect.height}px`;
    
    // Add size label
    const label = document.createElement('div');
    label.textContent = `${Math.round(rect.width)}×${Math.round(rect.height)}`;
    label.style.position = 'absolute';
    label.style.top = '-20px';
    label.style.left = '0';
    label.style.fontSize = '10px';
    label.style.backgroundColor = validation.isCompliant ? 'green' : 'red';
    label.style.color = 'white';
    label.style.padding = '2px 4px';
    label.style.borderRadius = '2px';
    label.style.whiteSpace = 'nowrap';
    
    indicator.appendChild(label);
    document.body.appendChild(indicator);
    
    // Remove after 5 seconds
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
      }
    }, 5000);
  });
  
  console.log('🎯 Touch target visualization added (will disappear in 5 seconds)');
  console.log('Green = Compliant, Red = Non-compliant');
};

// Add to window for easy access in development
if (typeof window !== 'undefined') {
  (window as any).fittsLawAudit = logFittsLawAudit;
  (window as any).visualizeTouchTargets = visualizeTouchTargets;
}
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Fitts's Law compliant sizing
      minHeight: {
        'touch': '44px',
        'click': '32px',
      },
      minWidth: {
        'touch': '44px',
        'click': '32px',
      },
      // Touch-friendly spacing
      spacing: {
        'touch-sm': '8px',
        'touch-md': '12px',
        'touch-lg': '16px',
        'click-sm': '4px',
        'click-md': '6px',
        'click-lg': '8px',
      },
    },
    screens: {
      'xs': '475px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
      // Touch device detection
      'touch': {'raw': '(hover: none) and (pointer: coarse)'},
      'no-touch': {'raw': '(hover: hover) and (pointer: fine)'},
    },
  },
  plugins: [],
};

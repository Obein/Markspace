/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: {
          dark: '#09090B',
          light: '#F4F4F5',
        },
        panel: {
          dark: 'rgba(24, 24, 27, 0.65)',
          light: 'rgba(255, 255, 255, 0.70)',
        },
        accent: {
          blue: '#3B82F6',
          emerald: '#10B981',
          amber: '#F59E0B',
          purple: '#8B5CF6',
        },
      },
      borderRadius: {
        'glass-sm': '12px',
        'glass-md': '16px',
        'glass-lg': '24px',
        'capsule': '9999px',
      },
      boxShadow: {
        'glass': '0 20px 40px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        'glass-light': '0 20px 40px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0, 0, 0, 0.06)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['Fira Code', 'JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};

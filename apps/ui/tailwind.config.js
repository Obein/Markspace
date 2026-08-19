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
        blue: {
          50: 'rgb(var(--accent-primary-rgb, 59 130 246) / 0.05)',
          100: 'rgb(var(--accent-primary-rgb, 59 130 246) / 0.1)',
          200: 'rgb(var(--accent-primary-rgb, 59 130 246) / 0.2)',
          300: 'var(--accent-primary-light, #93c5fd)',
          400: 'var(--accent-primary-light, #60a5fa)',
          500: 'rgb(var(--accent-primary-rgb, 59 130 246) / <alpha-value>)',
          600: 'var(--accent-primary, #3b82f6)',
          700: 'var(--accent-primary-hover, #2563eb)',
          800: 'var(--accent-primary-dark, #1d4ed8)',
          900: 'var(--accent-primary-dark, #1e3a8a)',
          950: 'var(--accent-primary-dark, #172554)',
        },
        accent: {
          DEFAULT: 'var(--accent-primary, #3B82F6)',
          hover: 'var(--accent-primary-hover, #2563EB)',
          light: 'var(--accent-primary-light, #60A5FA)',
          dark: 'var(--accent-primary-dark, #1D4ED8)',
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
        sans: ['var(--font-preview-body)', 'Noto Sans', 'sans-serif'],
        mono: ['var(--font-editor-mono)', 'Monaspace Neon', 'Monaspace', 'Noto Sans Mono', 'monospace'],
        serif: ['var(--font-preview-heading)', 'Noto Serif', 'serif'],
      },
    },
  },
  plugins: [],
};

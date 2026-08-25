import type { Config } from 'tailwindcss';

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
        primaryColor: {
          50:  'rgb(var(--accent-primary-rgb, 59 130 246) / 0.05)',
          100: 'rgb(var(--accent-primary-rgb, 59 130 246) / 0.1)',
          200: 'rgb(var(--accent-primary-rgb, 59 130 246) / 0.2)',
          300: 'rgb(var(--accent-primary-light-rgb, 147 197 253) / <alpha-value>)',
          400: 'rgb(var(--accent-primary-light-rgb, 96 165 250) / <alpha-value>)',
          500: 'rgb(var(--accent-primary-rgb, 59 130 246) / <alpha-value>)',
          600: 'rgb(var(--accent-primary-rgb, 59 130 246) / <alpha-value>)',
          700: 'rgb(var(--accent-primary-hover-rgb, 37 99 235) / <alpha-value>)',
          800: 'rgb(var(--accent-primary-dark-rgb, 29 78 216) / <alpha-value>)',
          900: 'rgb(var(--accent-primary-dark-rgb, 30 58 138) / <alpha-value>)',
          950: 'rgb(var(--accent-primary-dark-rgb, 23 37 84) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'var(--accent-primary, #3B82F6)',
          hover: 'var(--accent-primary-hover, #2563EB)',
          light: 'var(--accent-primary-light, #60A5FA)',
          dark: 'var(--accent-primary-dark, #1D4ED8)',
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
        mono: ['var(--font-editor-mono)', 'Monaspace Neon', 'Monaspace Argon', 'Noto Sans Mono', 'monospace'],
        serif: ['var(--font-preview-heading)', 'Noto Serif', 'serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;

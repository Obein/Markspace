import { useState, useEffect, useCallback } from 'react';

export type AccentColor = 'blue' | 'emerald' | 'violet' | 'amber' | 'rose' | 'cyan' | 'custom';

export interface AccentColorConfig {
  id: AccentColor;
  labelKey: string;
  name: string;
  dotClass: string;
  hex: string;
}

export const ACCENT_COLOR_OPTIONS: AccentColorConfig[] = [
  { id: 'blue', labelKey: 'accentBlue', name: 'Sapphire Blue', dotClass: 'bg-blue-500', hex: '#3b82f6' },
  { id: 'emerald', labelKey: 'accentEmerald', name: 'Emerald Green', dotClass: 'bg-emerald-500', hex: '#10b981' },
  { id: 'violet', labelKey: 'accentViolet', name: 'Cosmic Violet', dotClass: 'bg-violet-500', hex: '#8b5cf6' },
  { id: 'amber', labelKey: 'accentAmber', name: 'Amber Gold', dotClass: 'bg-amber-500', hex: '#f59e0b' },
  { id: 'rose', labelKey: 'accentRose', name: 'Rose Red', dotClass: 'bg-rose-500', hex: '#f43f5e' },
  { id: 'cyan', labelKey: 'accentCyan', name: 'Teal Cyan', dotClass: 'bg-cyan-500', hex: '#06b6d4' },
];

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return null;
  const num = parseInt(clean, 16);
  if (isNaN(num)) return null;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function useTheme(username?: string | null) {
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('markspace_dark_mode');
    return saved !== null ? saved === 'true' : true;
  });

  const getStorageKey = useCallback(
    (suffix: string) => {
      return username ? `markspace_${suffix}_${username}` : `markspace_${suffix}_default`;
    },
    [username]
  );

  const [accentColor, setAccentColorState] = useState<AccentColor>('blue');
  const [customHex, setCustomHexState] = useState<string>('#3b82f6');

  // Reload user-scoped accent preferences when user logs in / changes
  useEffect(() => {
    if (username) {
      const savedAccent = localStorage.getItem(getStorageKey('accent_color')) as AccentColor | null;
      const savedCustom = localStorage.getItem(getStorageKey('custom_hex'));
      setAccentColorState(savedAccent || 'blue');
      if (savedCustom) setCustomHexState(savedCustom);
    } else {
      // Unauthenticated / System default
      setAccentColorState('blue');
      setCustomHexState('#3b82f6');
    }
  }, [username, getStorageKey]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    localStorage.setItem('markspace_dark_mode', String(isDark));
  }, [isDark]);

  // Apply accent color and custom CSS properties to documentElement
  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accentColor);

    if (accentColor === 'custom' && customHex) {
      const rgb = hexToRgb(customHex);
      document.documentElement.style.setProperty('--accent-primary', customHex);
      document.documentElement.style.setProperty('--accent-primary-hover', customHex);
      document.documentElement.style.setProperty('--accent-primary-light', customHex);
      document.documentElement.style.setProperty('--accent-primary-dark', customHex);
      if (rgb) {
        document.documentElement.style.setProperty(
          '--accent-primary-rgb',
          `${rgb.r}, ${rgb.g}, ${rgb.b}`
        );
      }
    } else {
      document.documentElement.style.removeProperty('--accent-primary');
      document.documentElement.style.removeProperty('--accent-primary-hover');
      document.documentElement.style.removeProperty('--accent-primary-light');
      document.documentElement.style.removeProperty('--accent-primary-dark');
      document.documentElement.style.removeProperty('--accent-primary-rgb');
    }

    if (username) {
      localStorage.setItem(getStorageKey('accent_color'), accentColor);
      if (customHex) {
        localStorage.setItem(getStorageKey('custom_hex'), customHex);
      }
    }
  }, [accentColor, customHex, username, getStorageKey]);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => !prev);
  }, []);

  const setAccentColor = useCallback((color: AccentColor) => {
    setAccentColorState(color);
  }, []);

  const setCustomHex = useCallback((hex: string) => {
    setCustomHexState(hex);
    setAccentColorState('custom');
  }, []);

  return {
    isDark,
    setIsDark,
    toggleTheme,
    accentColor,
    setAccentColor,
    customHex,
    setCustomHex,
  };
}

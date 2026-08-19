import { useState, useEffect, useCallback } from 'react';

export type AccentColor = 'blue' | 'emerald' | 'violet' | 'amber' | 'rose' | 'cyan';

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

export function useTheme() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('markspace_dark_mode');
    return saved !== null ? saved === 'true' : true;
  });

  const [accentColor, setAccentColorState] = useState<AccentColor>(() => {
    return (localStorage.getItem('markspace_accent_color') as AccentColor) || 'blue';
  });

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

  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accentColor);
    localStorage.setItem('markspace_accent_color', accentColor);
  }, [accentColor]);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => !prev);
  }, []);

  const setAccentColor = useCallback((color: AccentColor) => {
    setAccentColorState(color);
  }, []);

  return {
    isDark,
    setIsDark,
    toggleTheme,
    accentColor,
    setAccentColor,
  };
}

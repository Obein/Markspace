import React, { useState } from 'react';
import { Lock, Palette, Globe, ChevronRight, ChevronDown, Check } from 'lucide-react';
import { ACCENT_COLOR_OPTIONS, AccentColor } from '../../../hooks/useTheme';
import { LANGUAGE_OPTIONS, Language, useI18n } from '../../../i18n/i18nContext';

export interface GeneralSettingsSectionProps {
  autoLockEnabled?: boolean;
  onToggleAutoLock?: (enabled: boolean) => void;
  autoLockMinutes?: number;
  onChangeAutoLockMinutes?: (minutes: number) => void;
  accentColor?: AccentColor;
  onSelectAccentColor?: (color: AccentColor) => void;
  customHex?: string;
  onSelectCustomHex?: (hex: string) => void;
}

export const GeneralSettingsSection: React.FC<GeneralSettingsSectionProps> = ({
  autoLockEnabled = true,
  onToggleAutoLock,
  autoLockMinutes = 15,
  onChangeAutoLockMinutes,
  accentColor = 'blue',
  onSelectAccentColor,
  customHex = '#3b82f6',
  onSelectCustomHex,
}) => {
  const { language, setLanguage, t } = useI18n();
  const [isThemeColorOpen, setIsThemeColorOpen] = useState(false);

  return (
    <>
      {/* Vault Auto-Lock Idle Settings */}
      <div className="p-4 rounded-2xl bg-black/[0.03] dark:bg-white/5 border border-black/10 dark:border-white/10 space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primaryColor-500/10 border border-primaryColor-500/20 text-primaryColor-600 dark:text-primaryColor-400">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block">
                {t('autoLockVault')}
              </span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block">
                {t('autoLockDesc')}
              </span>
            </div>
          </div>
          {/* Toggle Switch */}
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={autoLockEnabled}
              onChange={(e) => onToggleAutoLock && onToggleAutoLock(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primaryColor-600"></div>
          </label>
        </div>

        {autoLockEnabled && (
          <div className="pt-2 border-t border-black/10 dark:border-white/10 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-700 dark:text-zinc-300">{t('autoLockTimeout')}</span>
              <span className="text-primaryColor-600 dark:text-primaryColor-400 font-bold">
                {autoLockMinutes} {t('minutes')}
              </span>
            </div>

            {/* Quick Preset Buttons (5m, 15m, 30m, 60m) */}
            <div className="grid grid-cols-4 gap-1.5 font-mono text-xs">
              {[5, 15, 30, 60].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => onChangeAutoLockMinutes && onChangeAutoLockMinutes(mins)}
                  className={`py-1 rounded-lg border transition text-[11px] cursor-pointer ${
                    autoLockMinutes === mins
                      ? 'bg-primaryColor-600 text-white font-bold border-primaryColor-500 shadow-sm'
                      : 'bg-black/5 dark:bg-black/30 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border-black/10 dark:border-white/10'
                  }`}
                >
                  {mins} {t('minutes')}
                </button>
              ))}
            </div>

            {/* Slider for Custom 1 - 60 Min Range */}
            <div className="flex items-center gap-3 pt-1">
              <span className="text-[10px] text-zinc-500 font-mono">1m</span>
              <input
                type="range"
                min={1}
                max={60}
                step={1}
                value={autoLockMinutes}
                onChange={(e) =>
                  onChangeAutoLockMinutes &&
                  onChangeAutoLockMinutes(parseInt(e.target.value, 10))
                }
                className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-primaryColor-500"
              />
              <span className="text-[10px] text-zinc-500 font-mono">60m</span>
            </div>
          </div>
        )}
      </div>

      {/* Theme Accent Color Selection Section */}
      <div className="p-4 rounded-2xl bg-black/[0.03] dark:bg-white/5 border border-black/10 dark:border-white/10 mb-4 transition-all">
        <button
          type="button"
          onClick={() => setIsThemeColorOpen(!isThemeColorOpen)}
          className="w-full flex items-center justify-between text-xs font-medium text-zinc-800 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Palette className="w-4 h-4 text-primaryColor-500" />
            <span>{t('themeColor')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-3.5 h-3.5 rounded-full border border-black/10 dark:border-white/20 shadow-sm"
              style={{
                backgroundColor:
                  accentColor === 'custom'
                    ? customHex
                    : ACCENT_COLOR_OPTIONS.find((c) => c.id === accentColor)?.hex || '#3b82f6',
              }}
            />
            {isThemeColorOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
            )}
          </div>
        </button>

        {isThemeColorOpen && (
          <div className="pt-3.5 mt-3 border-t border-black/10 dark:border-white/10 space-y-3.5 animate-in fade-in duration-150">
            {/* Presets Grid */}
            <div className="grid grid-cols-6 gap-2">
              {ACCENT_COLOR_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    if (onSelectAccentColor) onSelectAccentColor(opt.id);
                    if (onSelectCustomHex) onSelectCustomHex(opt.hex);
                  }}
                  className={`relative flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer group ${
                    accentColor === opt.id
                      ? 'border-primaryColor-500 dark:border-white/50 bg-primaryColor-500/10 dark:bg-white/15 shadow-md scale-105'
                      : 'border-black/5 dark:border-white/5 bg-black/5 dark:bg-black/20 hover:bg-black/10 dark:hover:bg-white/10'
                  }`}
                >
                  <div
                    className="w-6 h-6 rounded-full shadow-md flex items-center justify-center transition-transform group-hover:scale-110 border border-black/10 dark:border-white/20"
                    style={{ backgroundColor: opt.hex }}
                  >
                    {accentColor === opt.id && (
                      <Check className="w-3.5 h-3.5 text-white drop-shadow" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Custom Color Palette Picker */}
            <div className="p-3 rounded-xl bg-black/5 dark:bg-black/30 border border-black/10 dark:border-white/10 backdrop-blur-md flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="color"
                    value={customHex}
                    onChange={(e) => onSelectCustomHex && onSelectCustomHex(e.target.value)}
                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                    id="customColorInput"
                  />
                  <label
                    htmlFor="customColorInput"
                    className={`w-7 h-7 rounded-full border border-black/10 dark:border-white/20 shadow-md flex items-center justify-center cursor-pointer transition-transform hover:scale-110 ${
                      accentColor === 'custom' ? 'ring-2 ring-primaryColor-500 dark:ring-white/50' : ''
                    }`}
                    style={{ backgroundColor: customHex }}
                  >
                    {accentColor === 'custom' && (
                      <Check className="w-3.5 h-3.5 text-white drop-shadow" />
                    )}
                  </label>
                </div>
                <span className="text-xs text-zinc-700 dark:text-zinc-300 font-mono font-semibold tracking-wider">
                  {customHex.toUpperCase()}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customHex}
                  maxLength={7}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                      if (onSelectCustomHex) {
                        onSelectCustomHex(val);
                      }
                    }
                  }}
                  className="w-24 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-black/15 dark:border-white/10 text-xs font-mono text-zinc-900 dark:text-white text-center uppercase focus:outline-none focus:border-primaryColor-500"
                  placeholder="#3B82F6"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Language Selection Section */}
      <div className="p-4 rounded-2xl bg-black/[0.03] dark:bg-white/5 border border-black/10 dark:border-white/10 space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-800 dark:text-zinc-200">
            <Globe className="w-4 h-4 text-primaryColor-600 dark:text-primaryColor-400" />
            <span>{t('language')}</span>
          </div>
          <span className="text-[10px] text-primaryColor-600 dark:text-primaryColor-400 font-mono font-semibold">
            {LANGUAGE_OPTIONS.find((l) => l.code === language)?.flag}{' '}
            {LANGUAGE_OPTIONS.find((l) => l.code === language)?.label}
          </span>
        </div>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
          className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-black/15 dark:border-white/10 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-primaryColor-500/50 transition cursor-pointer"
        >
          {LANGUAGE_OPTIONS.map((opt) => (
            <option
              key={opt.code}
              value={opt.code}
              className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
            >
              {opt.flag} {opt.label} ({opt.code})
            </option>
          ))}
        </select>
      </div>
    </>
  );
};

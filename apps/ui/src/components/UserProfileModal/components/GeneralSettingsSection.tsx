import React, { useState } from 'react';
import { Lock, Palette, Globe, ChevronRight, ChevronDown, Check, LogOut } from 'lucide-react';
import { ACCENT_COLOR_OPTIONS, AccentColor } from '../../../hooks/useTheme';
import { AutoLockAction } from '../../../hooks/useAutoLock';
import { LANGUAGE_OPTIONS, TranslationKey, useI18n } from '../../../i18n/i18nContext';

export interface GeneralSettingsSectionProps {
  autoLockEnabled?: boolean;
  onToggleAutoLock?: (enabled: boolean) => void;
  autoLockMinutes?: number;
  onChangeAutoLockMinutes?: (minutes: number) => void;
  autoLockAction?: AutoLockAction;
  onChangeAutoLockAction?: (action: AutoLockAction) => void;
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
  autoLockAction = 'lock',
  onChangeAutoLockAction,
  accentColor = 'blue',
  onSelectAccentColor,
  customHex = '#3b82f6',
  onSelectCustomHex,
}) => {
  const { language, setLanguage, t } = useI18n();
  const [isThemeColorOpen, setIsThemeColorOpen] = useState(false);

  const formatMinutesLabel = (mins: number) => {
    if (mins >= 1440) return `${Math.round(mins / 1440)} ${t('days')}`;
    if (mins >= 60) return `${Math.round(mins / 60)} ${t('hours')}`;
    return `${mins} ${t('minutes')}`;
  };

  return (
    <>
      {/* Vault Auto-Lock / Auto-Logout Idle Settings */}
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
                {formatMinutesLabel(autoLockMinutes)}
              </span>
            </div>

            {/* Quick Preset Buttons (15m, 30m, 1h, 4h, 8h, 1d) */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 font-mono text-xs">
              {[
                { mins: 15, label: '15m' },
                { mins: 30, label: '30m' },
                { mins: 60, label: '1h' },
                { mins: 240, label: '4h' },
                { mins: 480, label: '8h' },
                { mins: 1440, label: '1d' },
              ].map(({ mins, label }) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => onChangeAutoLockMinutes && onChangeAutoLockMinutes(mins)}
                  className={`py-1 rounded-lg border transition text-[11px] cursor-pointer text-center ${
                    autoLockMinutes === mins
                      ? 'bg-primaryColor-600 text-white font-bold border-primaryColor-500 shadow-sm'
                      : 'bg-black/5 dark:bg-black/30 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border-black/10 dark:border-white/10'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Action upon Timeout: Lock vs Logout */}
            <div className="pt-1 flex items-center justify-between gap-2">
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {t('timeoutAction')}
              </span>
              <div className="flex items-center gap-1.5 p-0.5 rounded-xl bg-black/5 dark:bg-black/30 border border-black/10 dark:border-white/10 text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => onChangeAutoLockAction && onChangeAutoLockAction('lock')}
                  className={`px-2 py-0.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                    autoLockAction === 'lock'
                      ? 'bg-primaryColor-600 text-white font-medium shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <Lock className="w-3 h-3" />
                  <span>{t('lockVault')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onChangeAutoLockAction && onChangeAutoLockAction('logout')}
                  className={`px-2 py-0.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                    autoLockAction === 'logout'
                      ? 'bg-red-600 text-white font-medium shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <LogOut className="w-3 h-3" />
                  <span>{t('logout')}</span>
                </button>
              </div>
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
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            )}
          </div>
        </button>

        {isThemeColorOpen && (
          <div className="pt-3.5 mt-3 border-t border-black/10 dark:border-white/10 space-y-3 animate-in fade-in duration-150">
            {/* Color Palette Grid */}
            <div className="grid grid-cols-6 gap-2">
              {ACCENT_COLOR_OPTIONS.map((opt) => {
                const isSelected = accentColor === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onSelectAccentColor && onSelectAccentColor(opt.id)}
                    className={`group relative flex flex-col items-center gap-1 p-2 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-primaryColor-500 bg-primaryColor-500/10 shadow-sm'
                        : 'border-black/5 dark:border-white/5 hover:border-black/20 dark:hover:border-white/20 hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    <span
                      className="w-6 h-6 rounded-full shadow-sm flex items-center justify-center transition-transform group-hover:scale-110"
                      style={{ backgroundColor: opt.hex }}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                    </span>
                    <span className="text-[10px] text-zinc-600 dark:text-zinc-400 font-mono">
                      {t(opt.labelKey as TranslationKey) || opt.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom Hex Color Picker */}
            <div className="flex items-center justify-between pt-1 border-t border-black/5 dark:border-white/5">
              <span className="text-xs text-zinc-600 dark:text-zinc-400 font-mono">
                {t('customHex')}
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={customHex}
                  onChange={(e) => {
                    if (onSelectCustomHex) onSelectCustomHex(e.target.value);
                    if (onSelectAccentColor) onSelectAccentColor('custom');
                  }}
                  className="w-6 h-6 rounded border border-black/10 dark:border-white/20 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={customHex}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (onSelectCustomHex) onSelectCustomHex(val);
                    if (onSelectAccentColor) onSelectAccentColor('custom');
                  }}
                  placeholder="#3b82f6"
                  className="w-20 px-2 py-1 text-xs font-mono rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-primaryColor-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Language Selection Section */}
      <div className="p-4 rounded-2xl bg-black/[0.03] dark:bg-white/5 border border-black/10 dark:border-white/10 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <Globe className="w-4 h-4 text-primaryColor-500" />
            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              {t('language')}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {LANGUAGE_OPTIONS.map((opt) => {
            const isSelected = language === opt.code;
            return (
              <button
                key={opt.code}
                type="button"
                onClick={() => setLanguage(opt.code)}
                className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium transition cursor-pointer ${
                  isSelected
                    ? 'border-primaryColor-500 bg-primaryColor-500/10 text-primaryColor-600 dark:text-primaryColor-400 font-semibold shadow-sm'
                    : 'border-black/5 dark:border-white/5 hover:border-black/20 dark:hover:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{opt.flag}</span>
                  <span>{opt.label}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-primaryColor-500" />}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

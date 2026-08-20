import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useI18n, LANGUAGE_OPTIONS, Language } from '../../../i18n/i18nContext';

export interface AuthCardHeaderProps {
  loginStep: number;
  onBackToStep1: () => void;
}

export const AuthCardHeader: React.FC<AuthCardHeaderProps> = ({
  loginStep,
  onBackToStep1,
}) => {
  const { t, language, setLanguage } = useI18n();

  return (
    <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
      <div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
        {loginStep === 2 ? (
          <button
            type="button"
            onClick={onBackToStep1}
            className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer flex items-center gap-1 text-[11px]"
            title="Back to username"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t('username')}</span>
          </button>
        ) : (
          <>
            <img
              src="/assets/obex_cat_eye_logo-256.webp"
              alt="Markspace Logo"
              className="w-4 h-4 rounded object-contain"
            />
            <span className="font-bold tracking-wider uppercase text-white">Markspace</span>
          </>
        )}
      </div>

      {/* Language Switcher Dropdown */}
      <div className="relative flex items-center">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
          className="pl-7 pr-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-xs font-mono transition cursor-pointer appearance-none focus:outline-none focus:border-primaryColor-500"
          title="Change Language / 切换语言"
        >
          {LANGUAGE_OPTIONS.map((opt) => (
            <option key={opt.code} value={opt.code} className="bg-zinc-900 text-white">
              {opt.flag} {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

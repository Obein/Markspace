import React, { useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useI18n } from '../../../i18n/i18nContext';

export interface AuthStep1UsernameProps {
  usernameInput: string;
  setUsernameInput: (val: string) => void;
  isRegisterMode: boolean;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

export const AuthStep1Username: React.FC<AuthStep1UsernameProps> = ({
  usernameInput,
  setUsernameInput,
  isRegisterMode,
  loading,
  onSubmit,
}) => {
  const { t } = useI18n();
  const [isUsernameFocused, setIsUsernameFocused] = useState(false);

  return (
    <form onSubmit={onSubmit} className="space-y-2.5">
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] font-medium text-zinc-300">{t('username')}</label>
          {isUsernameFocused && (
            <span className="text-[10px] text-zinc-400 font-mono animate-in fade-in duration-150">
              Unix: 5-32 chars
            </span>
          )}
        </div>
        <input
          type="text"
          value={usernameInput}
          onChange={(e) => setUsernameInput(e.target.value.toLowerCase())}
          onFocus={() => setIsUsernameFocused(true)}
          onBlur={() => setIsUsernameFocused(false)}
          placeholder={isRegisterMode ? 'e.g. alice_01' : t('enterUsername')}
          className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-primaryColor-500 text-xs font-mono"
          required
          autoFocus
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 px-4 rounded-xl bg-primaryColor-600 hover:bg-primaryColor-500 text-white font-semibold transition shadow-lg shadow-primaryColor-500/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-xs"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-white" />
        ) : (
          <>
            <span>{t('next')}</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
};

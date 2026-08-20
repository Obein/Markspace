import React from 'react';
import { LogIn, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useI18n } from '../../../i18n/i18nContext';

export interface AuthStep2CredentialsProps {
  loginMethod: 'password' | 'totp';
  setLoginMethod: (method: 'password' | 'totp') => void;
  isTotpEnabledForUser: boolean;
  totpCode: string;
  setTotpCode: (code: string) => void;
  accountPassword: string;
  setAccountPassword: (password: string) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

export const AuthStep2Credentials: React.FC<AuthStep2CredentialsProps> = ({
  loginMethod,
  setLoginMethod,
  isTotpEnabledForUser,
  totpCode,
  setTotpCode,
  accountPassword,
  setAccountPassword,
  showPassword,
  setShowPassword,
  loading,
  onSubmit,
}) => {
  const { t } = useI18n();

  return (
    <form onSubmit={onSubmit} className="space-y-2.5">
      {loginMethod === 'totp' ? (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-medium text-zinc-300">
              {t('totpCodePlaceholder')}
            </label>
            <button
              type="button"
              onClick={() => setLoginMethod('password')}
              className="text-[11px] text-primaryColor-400 hover:underline font-mono cursor-pointer"
            >
              {t('usePassword')}
            </button>
          </div>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-primaryColor-500 text-base font-mono tracking-widest text-center"
            required
            autoFocus
          />
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-medium text-zinc-300">{t('password')}</label>
            {isTotpEnabledForUser && (
              <button
                type="button"
                onClick={() => setLoginMethod('totp')}
                className="text-[11px] text-primaryColor-400 hover:underline font-mono cursor-pointer"
              >
                {t('useTotpCode')}
              </button>
            )}
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={accountPassword}
              onChange={(e) => setAccountPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-primaryColor-500 text-xs font-mono"
              required
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white transition cursor-pointer"
              title={showPassword ? 'Hide' : 'Show'}
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 px-4 rounded-xl bg-primaryColor-600 hover:bg-primaryColor-500 text-white font-semibold transition shadow-lg shadow-primaryColor-500/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-xs"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-white" />
        ) : (
          <>
            <LogIn className="w-4 h-4" />
            <span>{t('signIn')}</span>
          </>
        )}
      </button>
    </form>
  );
};

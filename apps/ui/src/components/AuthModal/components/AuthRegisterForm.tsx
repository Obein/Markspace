import React from 'react';
import { UserPlus, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useI18n } from '../../../i18n/i18nContext';

export interface AuthRegisterFormProps {
  accountPassword: string;
  setAccountPassword: (password: string) => void;
  confirmPassword: string;
  setConfirmPassword: (password: string) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (show: boolean) => void;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

export const AuthRegisterForm: React.FC<AuthRegisterFormProps> = ({
  accountPassword,
  setAccountPassword,
  confirmPassword,
  setConfirmPassword,
  showPassword,
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  loading,
  onSubmit,
}) => {
  const { t } = useI18n();

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] font-medium text-zinc-300">{t('password')}</label>
          <span className="text-[10px] text-zinc-400 font-mono">12-128 chars</span>
        </div>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={accountPassword}
            onChange={(e) => setAccountPassword(e.target.value)}
            placeholder="••••••••••••"
            className="w-full pl-3.5 pr-10 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-primaryColor-500 text-xs font-mono"
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

      <div>
        <label className="block text-[11px] font-medium text-zinc-300 mb-1">
          {t('confirmPassword')}
        </label>
        <div className="relative">
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••••••"
            className="w-full pl-3.5 pr-10 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-primaryColor-500 text-xs font-mono"
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white transition cursor-pointer"
            title={showConfirmPassword ? 'Hide' : 'Show'}
          >
            {showConfirmPassword ? (
              <EyeOff className="w-3.5 h-3.5" />
            ) : (
              <Eye className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      <p className="text-[10px] text-zinc-400 font-mono">
        {t('unixPasswordHint') || 'Unix format (12-128 chars, no complexity requirements)'}
      </p>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 px-4 rounded-xl bg-primaryColor-600 hover:bg-primaryColor-500 text-white font-semibold transition shadow-lg shadow-primaryColor-500/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-xs mt-1"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-white" />
        ) : (
          <>
            <UserPlus className="w-4 h-4" />
            <span>{t('register')}</span>
          </>
        )}
      </button>
    </form>
  );
};

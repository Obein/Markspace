import React, { useState } from 'react';
import { UserCheck, LogIn, UserPlus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/i18nContext';
import { AuthModalProps } from './AuthModal.types';

export const AuthModal: React.FC<AuthModalProps> = () => {
  const { apiClient, cryptoService, setToken, setUsername, setRole, isAuthenticated } = useApp();
  const { t } = useI18n();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput || !accountPassword) {
      setErrorMsg('Please enter both username and account password');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      const authToken = await cryptoService.deriveAuthToken(accountPassword, 'markspace-account-auth-salt');

      let res;
      if (isRegisterMode) {
        res = await apiClient.register(usernameInput, authToken);
      } else {
        res = await apiClient.login(usernameInput, authToken);
      }

      setToken(res.token);
      setUsername(res.user.username);
      setRole(res.user.role);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg">
      <div className="w-full max-w-md p-8 glass-panel rounded-glass-lg border border-white/10 text-white shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Glow Element */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center text-center mb-6">
          <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 mb-3 shadow-inner text-blue-400">
            <UserCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {isRegisterMode ? t('register') : t('signIn')}
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-xs">
            {t('welcomeTitle')}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">{t('username')}</label>
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="username"
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">{t('password')}</label>
            <input
              type="password"
              value={accountPassword}
              onChange={(e) => setAccountPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isRegisterMode ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>{t('register')}</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>{t('signIn')}</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400">
          <span>{isRegisterMode ? t('signIn') : t('register')}</span>
          <button
            onClick={() => setIsRegisterMode(!isRegisterMode)}
            className="text-blue-400 hover:underline transition font-medium"
          >
            {isRegisterMode ? t('signIn') : t('register')}
          </button>
        </div>
      </div>
    </div>
  );
};

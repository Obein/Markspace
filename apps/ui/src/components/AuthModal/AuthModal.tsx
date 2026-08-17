import React, { useState } from 'react';
import {
  UserCheck,
  LogIn,
  UserPlus,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/i18nContext';
import { AuthModalProps } from './AuthModal.types';

export const AuthModal: React.FC<AuthModalProps> = () => {
  const {
    apiClient,
    cryptoService,
    setToken,
    setUsername,
    setRole,
    isAuthenticated,
    securityAlert,
    clearSecurityAlert,
  } = useApp();
  const { t } = useI18n();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [loginStep, setLoginStep] = useState<1 | 2>(1);
  const [usernameInput, setUsernameInput] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [isTotpEnabledForUser, setIsTotpEnabledForUser] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'totp' | 'password'>('password');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return null;

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim()) {
      setErrorMsg('Please enter a username');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      clearSecurityAlert();

      const prelogin = await apiClient.prelogin(usernameInput.trim());
      if (!prelogin.exists) {
        setErrorMsg('User not found. Please check username or register.');
        return;
      }

      setIsTotpEnabledForUser(prelogin.isTotpEnabled);
      // If TOTP is enabled, default to passwordless TOTP login
      if (prelogin.isTotpEnabled) {
        setLoginMethod('totp');
      } else {
        setLoginMethod('password');
      }
      setLoginStep(2);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to lookup user');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setErrorMsg(null);

      let res;
      if (loginMethod === 'totp') {
        if (!totpCode || totpCode.trim().length !== 6) {
          setErrorMsg('Please enter your 6-digit TOTP code');
          return;
        }
        res = await apiClient.loginPasswordlessTotp(usernameInput.trim(), totpCode.trim());
      } else {
        if (!accountPassword) {
          setErrorMsg('Please enter your account password');
          return;
        }
        const authToken = await cryptoService.deriveAuthToken(
          accountPassword,
          'markspace-account-auth-salt'
        );
        res = await apiClient.login(
          usernameInput.trim(),
          authToken,
          isTotpEnabledForUser ? totpCode.trim() : undefined
        );
      }

      setToken(res.token);
      setUsername(res.user.username);
      setRole(res.user.role);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim() || !accountPassword) {
      setErrorMsg('Please enter both username and password');
      return;
    }
    if (accountPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      const authToken = await cryptoService.deriveAuthToken(
        accountPassword,
        'markspace-account-auth-salt'
      );
      const res = await apiClient.register(usernameInput.trim(), authToken);
      setToken(res.token);
      setUsername(res.user.username);
      setRole(res.user.role);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const resetToMode = (register: boolean) => {
    setIsRegisterMode(register);
    setLoginStep(1);
    setErrorMsg(null);
    setAccountPassword('');
    setConfirmPassword('');
    setTotpCode('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md p-8 glass-panel rounded-glass-lg border border-white/15 text-white shadow-2xl relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Security Alert Toast if triggered by Nonce Violation */}
        {securityAlert && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs flex items-start gap-2.5 font-mono animate-in fade-in duration-150">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-bold text-red-300">Security Alert: Force Logout</div>
              <div className="text-[11px] text-zinc-300 mt-0.5 leading-relaxed">{securityAlert}</div>
            </div>
          </div>
        )}

        <div className="flex flex-col items-center text-center mb-6">
          <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 mb-3 shadow-inner text-blue-400">
            <UserCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {isRegisterMode ? t('register') : t('signIn')}
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-xs">{t('welcomeTitle')}</p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs text-center font-mono">
            {errorMsg}
          </div>
        )}

        {isRegisterMode ? (
          /* Register Form */
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">{t('username')}</label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="choose a username"
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-xs font-mono"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">{t('password')}</label>
              <input
                type="password"
                value={accountPassword}
                onChange={(e) => setAccountPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-xs font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-xs font-mono"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-xs"
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
        ) : loginStep === 1 ? (
          /* Login Step 1: Input Username */
          <form onSubmit={handleStep1Submit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">{t('username')}</label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="enter your username"
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-xs font-mono"
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-xs"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* Login Step 2: Authenticate */
          <form onSubmit={handleLoginSubmit} className="space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setLoginStep(1);
                }}
                className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition font-mono cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{usernameInput}</span>
              </button>
              {isTotpEnabledForUser && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  TOTP MFA Active
                </span>
              )}
            </div>

            {loginMethod === 'totp' ? (
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center justify-between">
                  <span>6-Digit Authenticator Code (Passwordless)</span>
                  <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 text-lg tracking-[0.3em] font-mono text-center"
                  required
                  autoFocus
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">{t('password')}</label>
                  <input
                    type="password"
                    value={accountPassword}
                    onChange={(e) => setAccountPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-xs font-mono"
                    required
                    autoFocus
                  />
                </div>

                {isTotpEnabledForUser && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      TOTP 2FA Verification Code
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="6-digit code"
                      className="w-full px-4 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 text-xs font-mono tracking-widest text-center"
                      required
                    />
                  </div>
                )}
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-xs"
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

            {/* Switch between Passwordless TOTP and Password */}
            {isTotpEnabledForUser && (
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setLoginMethod(loginMethod === 'totp' ? 'password' : 'totp');
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 transition font-mono cursor-pointer"
                >
                  {loginMethod === 'totp' ? 'Or log in with Password' : 'Or log in with TOTP Code (Passwordless)'}
                </button>
              </div>
            )}
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400">
          <span>{isRegisterMode ? 'Already have an account?' : "Don't have an account?"}</span>
          <button
            onClick={() => resetToMode(!isRegisterMode)}
            className="text-blue-400 hover:underline transition font-medium cursor-pointer"
          >
            {isRegisterMode ? t('signIn') : t('register')}
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  LogIn,
  UserPlus,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Loader2,
  Languages,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useI18n, LANGUAGE_OPTIONS, Language } from '../../i18n/i18nContext';
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
  const { t, language, setLanguage } = useI18n();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [loginStep, setLoginStep] = useState<1 | 2>(1);
  const [usernameInput, setUsernameInput] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
      setErrorMsg('Please fill in all fields');
      return;
    }
    if (accountPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      clearSecurityAlert();

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

  const switchMode = (toRegister: boolean) => {
    setIsRegisterMode(toRegister);
    setLoginStep(1);
    setErrorMsg(null);
    setAccountPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setTotpCode('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      {/* Clean Solid Dark Modal without distracting multi-color gradients */}
      <div className="w-full max-w-md p-7 rounded-3xl bg-[#0e0e11] dark:bg-[#09090b] border border-white/15 text-white shadow-2xl relative overflow-hidden">
        
        {/* Top Header Row with App Branding & Language Switcher */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
            <img
              src="/assets/obex_cat_eye_logo-256.webp"
              alt="Markspace Logo"
              className="w-4 h-4 rounded object-contain"
            />
            <span className="font-bold tracking-wider uppercase text-white">Markspace</span>
          </div>

          {/* Language Switcher Dropdown */}
          <div className="relative flex items-center">
            <Languages className="w-3.5 h-3.5 text-blue-400 absolute left-2.5 pointer-events-none z-10" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="pl-7 pr-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-xs font-mono transition cursor-pointer appearance-none focus:outline-none focus:border-blue-500"
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

        <div className="flex flex-col items-center text-center mb-5">
          <div className="p-2 bg-gradient-to-b from-blue-500/20 to-purple-500/10 rounded-2xl border border-white/15 mb-3 shadow-xl shadow-blue-500/10 flex items-center justify-center">
            <img
              src="/assets/obex_cat_eye_logo-256.webp"
              alt="Markspace Logo"
              className="w-12 h-12 rounded-xl object-contain drop-shadow-md"
            />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
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
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">{t('username')}</label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="choose a username"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-xs font-mono"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">{t('password')}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={accountPassword}
                  onChange={(e) => setAccountPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-xs font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white transition cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-xs font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white transition cursor-pointer"
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-xs"
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
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-xs"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <>
                  <span>Next: Authenticate</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* Login Step 2: Adaptive Authentication (Password vs Passwordless TOTP) */
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs font-mono">
              <span className="text-zinc-400">User: <strong className="text-zinc-200">{usernameInput}</strong></span>
              <button
                type="button"
                onClick={() => {
                  setLoginStep(1);
                  setErrorMsg(null);
                }}
                className="text-blue-400 hover:underline flex items-center gap-1 text-[11px] cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Change</span>
              </button>
            </div>

            {/* If TOTP is enabled, show method switch tabs */}
            {isTotpEnabledForUser && (
              <div className="flex rounded-xl bg-black/40 p-1 border border-white/10 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setLoginMethod('totp')}
                  className={`flex-1 py-1.5 rounded-lg transition text-center cursor-pointer ${
                    loginMethod === 'totp'
                      ? 'bg-blue-600 text-white font-semibold shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Passwordless TOTP
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMethod('password')}
                  className={`flex-1 py-1.5 rounded-lg transition text-center cursor-pointer ${
                    loginMethod === 'password'
                      ? 'bg-blue-600 text-white font-semibold shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Password + 2FA
                </button>
              </div>
            )}

            {loginMethod === 'totp' ? (
              /* Passwordless TOTP Input */
              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-300 flex items-center justify-between">
                  <span>6-Digit Authenticator Code</span>
                  <span className="text-[10px] text-blue-400 font-mono">MFA Enabled</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 text-center tracking-[0.3em] font-mono text-lg"
                  required
                  autoFocus
                />
              </div>
            ) : (
              /* Password Input */
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">{t('password')}</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={accountPassword}
                      onChange={(e) => setAccountPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-xs font-mono"
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white transition cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isTotpEnabledForUser && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      2FA Verification Code (Optional fallback)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 text-center tracking-widest font-mono text-xs"
                    />
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-xs"
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
        )}

        <div className="mt-5 pt-3 border-t border-white/10 text-center">
          <button
            type="button"
            onClick={() => switchMode(!isRegisterMode)}
            className="text-xs text-zinc-400 hover:text-white transition font-mono cursor-pointer"
          >
            {isRegisterMode
              ? `Already have an account? ${t('signIn')}`
              : `Don't have an account? ${t('register')}`}
          </button>
        </div>
      </div>
    </div>
  );
};

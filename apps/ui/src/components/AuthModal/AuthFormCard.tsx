import React from 'react';
import {
  LogIn,
  UserPlus,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useI18n, LANGUAGE_OPTIONS, Language } from '../../i18n/i18nContext';
import { UseAuthModalFormReturn } from './useAuthModalForm';

export interface AuthFormCardProps {
  form: UseAuthModalFormReturn;
}

/**
 * AuthFormCard
 * Renders the centered glassmorphic authentication panel,
 * supporting multi-step username checks, password/TOTP inputs,
 * camera lens zoom-blur transitions, and language selection.
 */
export const AuthFormCard: React.FC<AuthFormCardProps> = ({ form }) => {
  const { t, language, setLanguage } = useI18n();
  const {
    isRegisterMode,
    loginStep,
    setLoginStep,
    isTransitioning,
    isFormFocused,
    setIsFormFocused,
    switchMode,
    usernameInput,
    setUsernameInput,
    accountPassword,
    setAccountPassword,
    confirmPassword,
    setConfirmPassword,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    totpCode,
    setTotpCode,
    isTotpEnabledForUser,
    loginMethod,
    setLoginMethod,
    loading,
    errorMsg,
    setErrorMsg,
    securityAlert,
    handleStep1Submit,
    handleLoginSubmit,
    handleRegisterSubmit,
  } = form;

  return (
    <div
      onFocusCapture={() => setIsFormFocused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsFormFocused(false);
        }
      }}
      className={`w-full max-w-[390px] h-[460px] p-5 sm:p-6 rounded-3xl bg-[#0e0e11] dark:bg-[#09090b] border text-white shadow-2xl relative overflow-hidden flex flex-col justify-between transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] z-20 ${
        isFormFocused
          ? 'scale-[1.03] border-white/30'
          : 'scale-100 border-white/15'
      } ${
        isTransitioning
          ? 'scale-90 blur-md opacity-60'
          : 'blur-0 opacity-100'
      }`}
    >
      {/* Top Header Row with App Branding & Language Switcher */}
      <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
          {loginStep === 2 ? (
            <button
              type="button"
              onClick={() => {
                setLoginStep(1);
                setErrorMsg(null);
              }}
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

      {/* Main Form Content Area */}
      <div className="flex-1 flex flex-col justify-center my-auto">
        {/* Security Alert Toast if triggered by Nonce Violation */}
        {securityAlert && (
          <div className="mb-2.5 p-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs flex items-start gap-2 font-mono animate-in fade-in duration-150">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-[11px]">
              <div className="font-bold text-red-300">Security Alert</div>
              <div className="text-zinc-300 leading-tight">{securityAlert}</div>
            </div>
          </div>
        )}

        {/* Hero Icon & Title: Step 1 shows system logo; Step 2 hides logo to free space */}
        <div className={`flex flex-col items-center text-center ${loginStep === 1 ? 'mb-3.5' : 'mb-2.5'}`}>
          {loginStep === 1 ? (
            <>
              <div className="p-2 bg-white/[0.04] rounded-2xl border border-white/10 mb-2 flex items-center justify-center">
                <img
                  src="/assets/obex_cat_eye_logo-256.webp"
                  alt="Markspace Logo"
                  className="w-9 h-9 rounded-xl object-contain drop-shadow-sm"
                />
              </div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                {isRegisterMode ? t('register') : t('signIn')}
              </h2>
              <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5 max-w-xs">{t('welcomeTitle')}</p>
            </>
          ) : (
            <div className="w-full text-left pb-1 flex items-center justify-between border-b border-white/5">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                  <span>{isRegisterMode ? t('register') : t('signIn')}</span>
                  <span className="text-xs text-blue-400 font-mono">@{usernameInput.trim()}</span>
                </h2>
                <p className="text-[11px] text-zinc-400">{t('step2Title')}</p>
              </div>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="mb-2.5 p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs text-center font-mono animate-in fade-in duration-150">
            {errorMsg}
          </div>
        )}

        {/* STEP 1: Username Only (For Both Login & Register) */}
        {loginStep === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-2.5">
            <div>
              <label className="block text-[11px] font-medium text-zinc-300 mb-1">{t('username')}</label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder={isRegisterMode ? t('chooseUsername') : t('enterUsername')}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-xs font-mono"
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-xs"
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
        )}

        {/* STEP 2: Password / MFA / Confirm Password */}
        {loginStep === 2 && (
          <>
            {isRegisterMode ? (
              /* Register Step 2: Passwords */
              <form onSubmit={handleRegisterSubmit} className="space-y-2">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">{t('password')}</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={accountPassword}
                      onChange={(e) => setAccountPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-3.5 pr-10 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-xs font-mono"
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
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">{t('confirmPassword')}</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-3.5 pr-10 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-xs font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white transition cursor-pointer"
                      title={showConfirmPassword ? 'Hide' : 'Show'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-xs mt-1"
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
            ) : (
              /* Login Step 2: Password or TOTP */
              <form onSubmit={handleLoginSubmit} className="space-y-2.5">
                {loginMethod === 'totp' ? (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-medium text-zinc-300">{t('totpCodePlaceholder')}</label>
                      <button
                        type="button"
                        onClick={() => setLoginMethod('password')}
                        className="text-[11px] text-blue-400 hover:underline font-mono cursor-pointer"
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
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 text-base font-mono tracking-widest text-center"
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
                          className="text-[11px] text-blue-400 hover:underline font-mono cursor-pointer"
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
                        className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-xs font-mono"
                        required
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white transition cursor-pointer"
                        title={showPassword ? 'Hide' : 'Show'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-xs"
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
          </>
        )}
      </div>

      {/* Bottom Mode Switch Link */}
      <div className="pt-2 border-t border-white/10 text-center">
        <button
          type="button"
          onClick={() => switchMode(!isRegisterMode)}
          className="text-xs text-zinc-400 hover:text-white transition font-mono cursor-pointer"
        >
          {isRegisterMode ? t('alreadyHaveAccount') : t('dontHaveAccount')}
        </button>
      </div>
    </div>
  );
};

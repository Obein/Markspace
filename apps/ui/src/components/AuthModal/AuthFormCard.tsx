import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useI18n } from '../../i18n/i18nContext';
import { UseAuthModalFormReturn } from './useAuthModalForm';
import { AuthCardHeader } from './components/AuthCardHeader';
import { AuthStep1Username } from './components/AuthStep1Username';
import { AuthStep2Credentials } from './components/AuthStep2Credentials';
import { AuthRegisterForm } from './components/AuthRegisterForm';

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
  const { t } = useI18n();
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
        isFormFocused ? 'scale-[1.03] border-white/30' : 'scale-100 border-white/15'
      } ${isTransitioning ? 'scale-90 blur-md opacity-60' : 'blur-0 opacity-100'}`}
    >
      {/* Top Header Row with App Branding & Language Switcher */}
      <AuthCardHeader
        loginStep={loginStep}
        onBackToStep1={() => {
          setLoginStep(1);
          setErrorMsg(null);
        }}
      />

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
        <div
          className={`flex flex-col items-center text-center ${
            loginStep === 1 ? 'mb-3.5' : 'mb-2.5'
          }`}
        >
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
              <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5 max-w-xs">
                {t('welcomeTitle')}
              </p>
            </>
          ) : (
            <div className="w-full text-left pb-1 flex items-center justify-between border-b border-white/5">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                  <span>{isRegisterMode ? t('register') : t('signIn')}</span>
                  <span className="text-xs text-primaryColor-400 font-mono">
                    @{usernameInput.trim()}
                  </span>
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
          <AuthStep1Username
            usernameInput={usernameInput}
            setUsernameInput={setUsernameInput}
            isRegisterMode={isRegisterMode}
            loading={loading}
            onSubmit={handleStep1Submit}
          />
        )}

        {/* STEP 2: Password / MFA / Confirm Password */}
        {loginStep === 2 && (
          <>
            {isRegisterMode ? (
              <AuthRegisterForm
                accountPassword={accountPassword}
                setAccountPassword={setAccountPassword}
                confirmPassword={confirmPassword}
                setConfirmPassword={setConfirmPassword}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                showConfirmPassword={showConfirmPassword}
                setShowConfirmPassword={setShowConfirmPassword}
                loading={loading}
                onSubmit={handleRegisterSubmit}
              />
            ) : (
              <AuthStep2Credentials
                loginMethod={loginMethod}
                setLoginMethod={setLoginMethod}
                isTotpEnabledForUser={isTotpEnabledForUser}
                totpCode={totpCode}
                setTotpCode={setTotpCode}
                accountPassword={accountPassword}
                setAccountPassword={setAccountPassword}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                loading={loading}
                onSubmit={handleLoginSubmit}
              />
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

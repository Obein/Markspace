import React from 'react';
import { AlertTriangle, Key, Fingerprint, Copy, Check, ShieldAlert, Sparkles } from 'lucide-react';
import { useI18n } from '../../i18n/i18nContext';
import { useApp } from '../../context/AppContext';
import { UseAuthModalFormReturn } from './useAuthModalForm';
import { AuthCardHeader } from './components/AuthCardHeader';

export interface AuthFormCardProps {
  form: UseAuthModalFormReturn;
}

export const AuthFormCard: React.FC<AuthFormCardProps> = ({ form }) => {
  const { t } = useI18n();
  const { systemConfigErrors } = useApp();
  const {
    isRegisterMode,
    isTransitioning,
    isFormFocused,
    setIsFormFocused,
    switchMode,
    usernameInput,
    setUsernameInput,
    rememberMe,
    setRememberMe,
    generatedMnemonic,
    copiedMnemonic,
    copyMnemonicToClipboard,
    handleConfirmMnemonicSaved,
    needsRecoveryFallback,
    recoveryInput,
    setRecoveryInput,
    handleRecoveryFallbackSubmit,
    loading,
    errorMsg,
    setErrorMsg,
    securityAlert,
    handlePasskeyAuthSubmit,
  } = form;

  const mnemonicWords = generatedMnemonic ? generatedMnemonic.split(/\s+/).filter(Boolean) : [];

  return (
    <div
      onFocusCapture={() => setIsFormFocused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsFormFocused(false);
        }
      }}
      className={`w-full max-w-[420px] min-h-[480px] p-5 sm:p-6 rounded-3xl bg-[#0e0e11]/95 dark:bg-[#09090b]/95 border text-white shadow-2xl relative overflow-hidden flex flex-col justify-between transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] z-20 ${
        isFormFocused ? 'scale-[1.02] border-white/30' : 'scale-100 border-white/15'
      } ${isTransitioning ? 'scale-95 blur-md opacity-60' : 'blur-0 opacity-100'}`}
    >
      {/* Top Header Row with App Branding & Language Switcher */}
      <AuthCardHeader
        loginStep={needsRecoveryFallback ? 2 : 1}
        onBackToStep1={() => {
          setErrorMsg(null);
        }}
      />

      {/* Main Form Content Area */}
      <div className="flex-1 flex flex-col justify-center my-auto py-2">
        {/* System Secrets Configuration Warning Banner */}
        {systemConfigErrors && systemConfigErrors.length > 0 && (
          <div className="mb-3 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5 font-mono animate-in fade-in duration-200">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-[11px] leading-relaxed">
              <div className="font-bold text-amber-300">服务端机密配置异常</div>
              <div className="text-zinc-300 mt-1 space-y-0.5">
                {systemConfigErrors.map((err, i) => (
                  <div key={i} className="text-red-300">• {err}</div>
                ))}
              </div>
              <div className="text-[10px] text-amber-400/80 mt-1.5 font-sans">
                请在 Cloudflare 控制台（Workers &gt; 设置 &gt; 变量和机密）配置对应机密（长度需 ≥ 30 字符）。
              </div>
            </div>
          </div>
        )}

        {/* Security Alert Toast if triggered by Nonce Violation */}
        {securityAlert && (
          <div className="mb-3 p-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs flex items-start gap-2 font-mono animate-in fade-in duration-150">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-[11px]">
              <div className="font-bold text-red-300">Security Alert</div>
              <div className="text-zinc-300 leading-tight">{securityAlert}</div>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {errorMsg && (
          <div className="mb-3 p-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-xs text-center font-mono animate-in fade-in duration-150">
            {errorMsg}
          </div>
        )}

        {/* CASE 1: 12-Word Recovery Phrase Display after Passkey Registration */}
        {generatedMnemonic ? (
          <div className="flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="p-2 bg-amber-500/10 rounded-2xl border border-amber-500/20 mb-2.5 text-amber-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Emergency Recovery Phrase
            </h2>
            <p className="text-[11px] text-zinc-400 mt-1 mb-3 max-w-xs leading-relaxed">
              Markspace uses end-to-end encryption. Save these 12 BIP-39 words offline. If you lose your Passkey device, this is the <strong>only</strong> way to recover your data.
            </p>

            {/* 12-Word Grid */}
            <div className="w-full grid grid-cols-3 gap-1.5 p-2.5 bg-black/40 border border-white/10 rounded-2xl mb-3 font-mono text-[11px]">
              {mnemonicWords.map((word, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded-lg border border-white/5 text-zinc-200"
                >
                  <span className="text-[9px] text-zinc-500 w-3.5 text-right">{idx + 1}.</span>
                  <span className="font-medium truncate">{word}</span>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="w-full flex gap-2 mb-2">
              <button
                type="button"
                onClick={copyMnemonicToClipboard}
                className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-zinc-300 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                {copiedMnemonic ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-green-400 font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Copy Words</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmMnemonicSaved}
                className="flex-[1.5] py-2 px-3 rounded-xl bg-primaryColor-600 hover:bg-primaryColor-500 disabled:opacity-50 text-white text-xs font-bold font-mono transition flex items-center justify-center gap-1.5 shadow-lg shadow-primaryColor-950/50 cursor-pointer"
              >
                {loading ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>I have saved my phrase</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : needsRecoveryFallback ? (
          /* CASE 2: Non-PRF Fallback Recovery Input during Login */
          <form onSubmit={handleRecoveryFallbackSubmit} className="flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center mb-3">
              <div className="p-2 bg-blue-500/10 rounded-2xl border border-blue-500/20 mb-2 text-blue-400">
                <Key className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Device Cryptographic Binding
              </h2>
              <p className="text-[11px] text-zinc-400 mt-1 max-w-xs leading-relaxed">
                This browser or device requires initial 12-word recovery confirmation to decrypt your root cryptographic envelope.
              </p>
            </div>

            <textarea
              rows={3}
              value={recoveryInput}
              onChange={(e) => setRecoveryInput(e.target.value)}
              placeholder="Enter your 12-word recovery phrase separated by spaces..."
              className="w-full p-2.5 bg-black/40 border border-white/10 focus:border-primaryColor-500 rounded-2xl text-xs font-mono text-zinc-200 placeholder-zinc-500 outline-none resize-none mb-3"
              autoFocus
            />

            <button
              type="submit"
              disabled={loading || !recoveryInput.trim()}
              className="w-full py-2.5 rounded-xl bg-primaryColor-600 hover:bg-primaryColor-500 disabled:opacity-50 text-white text-xs font-bold font-mono transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-primaryColor-950/50"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Fingerprint className="w-4 h-4" />
                  <span>Decrypt Vaults & Bind Device</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* CASE 3: Standard Passkey Login / Register Form */
          <form onSubmit={handlePasskeyAuthSubmit} className="flex flex-col">
            <div className="flex flex-col items-center text-center mb-3.5">
              <div className="p-2 bg-white/[0.04] rounded-2xl border border-white/10 mb-2 flex items-center justify-center">
                <img
                  src="/assets/obex_cat_eye_logo-256.webp"
                  alt="Markspace Logo"
                  className="w-9 h-9 rounded-xl object-contain drop-shadow-sm"
                />
              </div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                {isRegisterMode ? 'Create Passkey Account' : 'Sign in with Passkey'}
              </h2>
              <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5 max-w-xs">
                {isRegisterMode
                  ? 'Zero passwords. Protected by Touch ID, Face ID, or Security Key.'
                  : 'Fast, phishing-resistant biometric authentication.'}
              </p>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                  {t('username')} {isRegisterMode && <span className="text-red-400">*</span>}
                </label>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder={isRegisterMode ? 'username (e.g. alice)' : 'username (optional)'}
                  autoComplete="username webauthn"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 focus:border-primaryColor-500 rounded-xl text-xs font-mono text-white placeholder-zinc-500 outline-none transition"
                  autoFocus={isRegisterMode}
                />
                {!isRegisterMode && (
                  <p className="text-[10px] text-zinc-500 mt-1 font-mono">
                    Leave empty for discoverable passkey login.
                  </p>
                )}
              </div>

              {!isRegisterMode && (
                <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-zinc-400 select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded bg-white/10 border-white/20 text-primaryColor-600 focus:ring-0 cursor-pointer"
                  />
                  <span>{t('rememberMe' as any) || 'Remember this device'}</span>
                </label>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-primaryColor-600 hover:bg-primaryColor-500 disabled:opacity-50 text-white text-xs font-bold font-mono transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-primaryColor-950/50"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Fingerprint className="w-4 h-4 text-white" />
                  <span>{isRegisterMode ? 'Create Passkey & Vault' : 'Sign in with Passkey'}</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Bottom Mode Switch Link */}
      {!generatedMnemonic && !needsRecoveryFallback && (
        <div className="pt-2 border-t border-white/10 text-center">
          <button
            type="button"
            onClick={() => switchMode(!isRegisterMode)}
            className="text-xs text-zinc-400 hover:text-white transition font-mono cursor-pointer"
          >
            {isRegisterMode
              ? (t('alreadyHaveAccount') || 'Already have an account? Sign in')
              : (t('dontHaveAccount') || "Don't have an account? Create one")}
          </button>
        </div>
      )}
    </div>
  );
};

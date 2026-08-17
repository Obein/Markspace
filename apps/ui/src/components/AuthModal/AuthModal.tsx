import React, { useState } from 'react';
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
import { useApp } from '../../context/AppContext';
import { useI18n, LANGUAGE_OPTIONS, Language } from '../../i18n/i18nContext';
import { AuthModalProps } from './AuthModal.types';
import { BentoCard } from './BentoCard';
import {
  SvgAesEnvelope,
  SvgGlobalEdge,
  SvgTotpDial,
  SvgOprfCurve,
  SvgRamPurge,
  SvgKaTeXMermaid,
  SvgVisualTable,
  SvgCommitChain,
  SvgNonceCircuit,
  SvgTypographyOled,
} from './BentoSvgGraphics';

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

  // Camera lens blur & scale transition state
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isFormFocused, setIsFormFocused] = useState(false);

  if (isAuthenticated) return null;

  // Step 1: Username input check for both Login and Register
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = usernameInput.trim();
    if (!cleanUsername) {
      setErrorMsg(t('chooseUsername'));
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      clearSecurityAlert();

      const prelogin = await apiClient.prelogin(cleanUsername);

      if (isRegisterMode) {
        // Register Mode: Verify username uniqueness
        if (prelogin.exists) {
          setErrorMsg(t('usernameTaken'));
          return;
        }
        setLoginStep(2);
      } else {
        // Login Mode: Check user existence
        if (!prelogin.exists) {
          setErrorMsg(t('userNotFound'));
          return;
        }

        setIsTotpEnabledForUser(prelogin.isTotpEnabled);
        if (prelogin.isTotpEnabled) {
          setLoginMethod('totp');
        } else {
          setLoginMethod('password');
        }
        setLoginStep(2);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setErrorMsg(null);

      let res;
      if (loginMethod === 'totp') {
        if (!totpCode || totpCode.trim().length !== 6) {
          setErrorMsg(t('enterTotpCode'));
          return;
        }
        res = await apiClient.loginPasswordlessTotp(usernameInput.trim(), totpCode.trim());
      } else {
        if (!accountPassword) {
          setErrorMsg(t('enterPassword'));
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

  // Step 2 Register Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountPassword) {
      setErrorMsg(t('enterPassword'));
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

  // Camera lens zoom-blur mode switch transition
  const switchMode = (toRegister: boolean) => {
    if (isTransitioning) return;
    setIsTransitioning(true);

    setTimeout(() => {
      setIsRegisterMode(toRegister);
      setLoginStep(1);
      setErrorMsg(null);
      setAccountPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      setTotpCode('');

      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 180);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto lg:overflow-hidden bg-[#050507] backdrop-blur-xl animate-in fade-in duration-300 flex items-center justify-center">
      {/* Ultra-dim theme-color residual afterglow (非常非常暗淡的主题色残影) */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center overflow-hidden -z-10">
        <div
          className="w-[140vw] h-[140vw] max-w-[2200px] max-h-[2200px] rounded-full blur-[140px] opacity-15 animate-[spin_120s_linear_infinite]"
          style={{
            background:
              'conic-gradient(from 0deg at 50% 50%, rgba(59,130,246,0.2) 0deg, rgba(0,0,0,0) 100deg, rgba(37,99,235,0.15) 180deg, rgba(0,0,0,0) 280deg, rgba(59,130,246,0.2) 360deg)',
          }}
        />
      </div>

      <div className="w-full max-w-[1700px] h-full lg:h-screen p-2.5 sm:p-3.5 lg:p-4 mx-auto flex flex-col justify-between relative z-10 gap-2.5 sm:gap-3 lg:gap-3.5">
        
        {/* ========================================================================= */}
        {/* ========================================================================= */}
        {/* TOP ROW: 3 Distinct Asymmetric Bento Cards (Span 6 - Span 2 - Span 4)     */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 sm:gap-3 lg:gap-3.5 flex-[1] min-h-0">
          {/* Top Left: 256-bit AES-GCM (Span 6 - Wide Hero Banner) */}
          <BentoCard
            className={`col-span-1 md:col-span-6 h-full transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isFormFocused ? '-translate-y-[62%] -translate-x-[20%] opacity-40 blur-[0.5px]' : 'translate-0 opacity-100 blur-0'
            }`}
            heroTitle={<span className="text-3xl sm:text-4xl lg:text-5xl font-black text-white">256-bit</span>}
            heroSubtitle={t('bentoE2eeSub')}
            svgGraphic={<SvgAesEnvelope />}
            detailTitle={t('bentoE2eeTitle')}
            detailText={t('bentoE2eeDesc')}
            detailSpecs={[
              { label: 'Algorithm', value: 'AES-256-GCM' },
              { label: 'Key Derivation', value: 'PBKDF2-HMAC-SHA256' },
              { label: 'IV Spec', value: '96-bit CSPRNG' },
            ]}
          />

          {/* Top Center: Global Edge Storage (Span 2 - Ultra-Compact Mini Chip) */}
          <BentoCard
            className={`col-span-1 md:col-span-2 h-full text-center items-center transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isFormFocused ? '-translate-y-[68%] opacity-30 blur-[0.5px]' : 'translate-0 opacity-100 blur-0'
            }`}
            heroTitle={<span className="text-2xl sm:text-3xl lg:text-4xl font-black text-blue-400">&lt;15ms</span>}
            heroSubtitle={t('bentoEdgeSub')}
            svgGraphic={<SvgGlobalEdge />}
            detailTitle={t('bentoEdgeTitle')}
            detailText={t('bentoEdgeDesc')}
            detailSpecs={[
              { label: 'Edge Network', value: '300+ Global PoPs' },
              { label: 'Database', value: 'Cloudflare D1 SQL' },
              { label: 'Object Storage', value: 'Cloudflare R2 Bucket' },
            ]}
          />

          {/* Top Right: MFA (Span 4 - Medium Card) */}
          <BentoCard
            className={`col-span-1 md:col-span-4 h-full transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isFormFocused ? '-translate-y-[62%] translate-x-[20%] opacity-40 blur-[0.5px]' : 'translate-0 opacity-100 blur-0'
            }`}
            heroTitle={<span className="text-3xl sm:text-4xl lg:text-5xl font-black text-white">MFA</span>}
            heroSubtitle={t('bentoMfaSub')}
            svgGraphic={<SvgTotpDial />}
            detailTitle={t('bentoMfaTitle')}
            detailText={t('bentoMfaDesc')}
            detailSpecs={[
              { label: 'Verification Type', value: 'Multi-Factor (MFA / 2FA)' },
              { label: 'Rotation Cycle', value: '30 Seconds' },
              { label: 'Standard', value: 'RFC 6238 TOTP' },
            ]}
          />
        </div>

        {/* ========================================================================= */}
        {/* MIDDLE ROW: Left Column | Fixed Center Panel | Right Column               */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3 lg:gap-3.5 flex-[2.2] min-h-0 items-stretch">
          
          {/* Left Column (Span 4): Zero-Knowledge & Content-Addressable Cryptography */}
          <div className="col-span-1 lg:col-span-4 h-full flex flex-col gap-2.5 sm:gap-3 justify-between order-2 lg:order-1">
            {/* OPRF Blind Verification (Disperses Up & Left) */}
            <BentoCard
              className={`flex-[1.2] min-h-0 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isFormFocused ? '-translate-x-[62%] -translate-y-[28%] opacity-40 blur-[0.5px]' : 'translate-0 opacity-100 blur-0'
              }`}
              heroTitle={<span className="text-2xl sm:text-3xl lg:text-4xl font-black text-white">OPRF Blind</span>}
              heroSubtitle={t('bentoOprfSub')}
              svgGraphic={<SvgOprfCurve />}
              detailTitle={t('bentoOprfTitle')}
              detailText={t('bentoOprfDesc')}
              detailSpecs={[
                { label: 'Curve Spec', value: 'NIST P-256 (secp256r1)' },
                { label: 'Gate Lockout', value: 'Adaptive Exponential' },
                { label: 'Server State', value: 'Zero Plaintext' },
              ]}
            />

            {/* Version Control / Merkle DAG Commits (Disperses Down & Left) */}
            <BentoCard
              className={`flex-[0.8] min-h-0 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isFormFocused ? '-translate-x-[62%] translate-y-[28%] opacity-40 blur-[0.5px]' : 'translate-0 opacity-100 blur-0'
              }`}
              heroTitle={<span className="text-2xl sm:text-3xl font-black text-white">{t('bentoVersionControlTitle')}</span>}
              heroSubtitle={t('bentoVersionControlSub')}
              svgGraphic={<SvgCommitChain />}
              detailTitle={t('bentoHistoryTitle')}
              detailText={t('bentoHistoryDesc')}
              detailSpecs={[
                { label: 'Integrity Digest', value: 'SHA-256 Hashes' },
                { label: 'Graph Model', value: 'Merkle DAG Tree' },
                { label: 'History Rollback', value: 'Point-in-Time' },
              ]}
            />
          </div>

          {/* Center Column (Span 4): Fixed Centered Login / Register Panel */}
          <div className="col-span-1 lg:col-span-4 h-full flex items-center justify-center order-1 lg:order-2">
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
          </div>

          {/* Right Column (Span 4): Scientific Notation, Flowcharts & Spreadsheet Suite */}
          <div className="col-span-1 lg:col-span-4 h-full flex flex-col gap-2.5 sm:gap-3 justify-between order-3">
            {/* KaTeX + Mermaid (Disperses Up & Right) */}
            <BentoCard
              className={`flex-[1.1] min-h-0 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isFormFocused ? 'translate-x-[62%] -translate-y-[28%] opacity-40 blur-[0.5px]' : 'translate-0 opacity-100 blur-0'
              }`}
              heroTitle={<span className="text-2xl sm:text-3xl font-black text-white">KaTeX + Mermaid</span>}
              heroSubtitle={t('bentoKaTeXSub')}
              svgGraphic={<SvgKaTeXMermaid />}
              detailTitle={t('bentoMarkdownTitle')}
              detailText={t('bentoMarkdownDesc')}
              detailSpecs={[
                { label: 'Math Typesetting', value: 'KaTeX v0.16' },
                { label: 'Diagramming', value: 'Mermaid v10' },
                { label: 'Syntax Parser', value: 'Lezer Incremental' },
              ]}
            />

            {/* Visual Table Editor (Disperses Down & Right) */}
            <BentoCard
              className={`flex-[1.1] min-h-0 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isFormFocused ? 'translate-x-[62%] translate-y-[28%] opacity-40 blur-[0.5px]' : 'translate-0 opacity-100 blur-0'
              }`}
              heroTitle={<span className="text-2xl sm:text-3xl font-black text-white">{t('bentoTableTitle')}</span>}
              heroSubtitle={t('bentoTableSub')}
              svgGraphic={<SvgVisualTable />}
              detailTitle={t('bentoTableDetailTitle')}
              detailText={t('bentoTableDesc')}
              detailSpecs={[
                { label: 'Grid Engine', value: 'Interactive WYSIWYG' },
                { label: 'Formulas', value: 'SUM, AVG, COUNT, IF' },
                { label: 'Serialization', value: 'Lossless GFM Markdown' },
              ]}
            />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BOTTOM ROW: 3 Asymmetric Bento Cards (3 cols - 5 cols - 4 cols)          */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 sm:gap-3 lg:gap-3.5 flex-[1] min-h-0">
          {/* Bottom Left: RAM Shield (Span 3 - Compact Card) */}
          <BentoCard
            className={`col-span-1 md:col-span-3 h-full transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isFormFocused ? 'translate-y-[62%] -translate-x-[20%] opacity-40 blur-[0.5px]' : 'translate-0 opacity-100 blur-0'
            }`}
            heroTitle={<span className="text-2xl sm:text-3xl font-black text-zinc-100">RAM Shield</span>}
            heroSubtitle={t('bentoMemorySub')}
            svgGraphic={<SvgRamPurge />}
            detailTitle={t('bentoMemoryTitle')}
            detailText={t('bentoMemoryDesc')}
            detailSpecs={[
              { label: 'Key Isolation', value: 'V8 Engine Heap' },
              { label: 'Lock Action', value: 'Memory Zeroize' },
            ]}
          />

          {/* Bottom Center: Nonce Anti-Replay Gate (Span 5 - Wide Hero Card) */}
          <BentoCard
            className={`col-span-1 md:col-span-5 h-full transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isFormFocused ? 'translate-y-[68%] opacity-30 blur-[0.5px]' : 'translate-0 opacity-100 blur-0'
            }`}
            heroTitle={<span className="text-2xl sm:text-3xl lg:text-4xl font-black text-white">Anti-Replay Gate</span>}
            heroSubtitle={t('bentoNonceSub')}
            svgGraphic={<SvgNonceCircuit />}
            detailTitle={t('bentoNonceTitle')}
            detailText={t('bentoNonceDesc')}
            detailSpecs={[
              { label: 'Challenge Spec', value: '6-Byte Nonce' },
              { label: 'Device Binding', value: 'RFC 9449 DPoP' },
              { label: 'Protection', value: 'Zero-Replay Lock' },
            ]}
          />

          {/* Bottom Right: Monaspace OLED Dark (Span 4 - Medium Card) */}
          <BentoCard
            className={`col-span-1 md:col-span-4 h-full transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isFormFocused ? 'translate-y-[62%] translate-x-[20%] opacity-40 blur-[0.5px]' : 'translate-0 opacity-100 blur-0'
            }`}
            heroTitle={<span className="text-2xl sm:text-3xl lg:text-4xl font-black text-white">Monaspace</span>}
            heroSubtitle={t('bentoTypographySub')}
            svgGraphic={<SvgTypographyOled />}
            detailTitle={t('bentoTypographyTitle')}
            detailText={t('bentoTypographyDesc')}
            detailSpecs={[
              { label: 'Code Engine', value: 'GitHub Monaspace' },
              { label: 'CJK Prose', value: 'Noto Sans / Serif' },
              { label: 'Theme Base', value: 'OLED #070709' },
            ]}
          />
        </div>

      </div>
    </div>
  );
};
